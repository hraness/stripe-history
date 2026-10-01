import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { runStylexNextBuild } from "@hraness/ui/stylex-build/next";
import { determineChunkIdFromSource } from "@posthog/plugin-utils";

type BuildRecord = Awaited<ReturnType<typeof runStylexNextBuild>>;
type Artifact = { path: string; bytes: number; sha256: string };
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
};
function logical(value: unknown): string {
  assert.ok(typeof value === "string" && value.length > 0 && !value.includes("\\") && !value.includes("\0"));
  assert.ok(value.split("/").every((part) => part && part !== "." && part !== ".."));
  return value;
}
function artifact(value: unknown): Artifact {
  const entry = object(value);
  const path = logical(entry.path);
  assert.ok(typeof entry.bytes === "number" && Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && entry.bytes <= 64 * 1024 * 1024);
  assert.ok(typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/u.test(entry.sha256));
  return { path, bytes: entry.bytes, sha256: entry.sha256 };
}
async function bytes(root: string, path: string, expected?: Artifact): Promise<Buffer> {
  const absolute = join(root, logical(path));
  assert.equal(await realpath(absolute), absolute, "Publication input traverses a symlink");
  const fd = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await fd.stat();
    assert.ok(before.isFile() && before.size <= 64 * 1024 * 1024, "Bounded ordinary publication file required");
    const data = await fd.readFile();
    const after = await fd.stat();
    assert.deepEqual([after.dev, after.ino, after.size, after.mtimeMs, after.ctimeMs], [before.dev, before.ino, before.size, before.mtimeMs, before.ctimeMs]);
    assert.equal(data.length, before.size);
    if (expected) assert.deepEqual({ path, bytes: data.length, sha256: sha(data) }, expected, "Compiler artifact changed before publication");
    return data;
  } finally { await fd.close(); }
}
async function inventory(root: string, prefix = ""): Promise<Artifact[]> {
  const result: Artifact[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), "Publication output contains a symlink");
    if (entry.isDirectory()) result.push(...await inventory(root, path));
    else {
      assert.ok(entry.isFile(), "Publication output contains a non-file");
      if (/\.(?:map|[cm]?js|css|nft\.json)$/u.test(path)) {
        const data = await bytes(root, path);
        result.push({ path, bytes: data.length, sha256: sha(data) });
      }
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

/** Called only after the complete compiler and native delivery proofs pass.
 * The compiler record remains pre-projection evidence. This separate receipt
 * proves upload-only processing and removal of exact, verified map artifacts. */
export async function publishPostHogMaps(
  root: string,
  record: BuildRecord,
  upload: (files: string[]) => Promise<void>,
): Promise<string> {
  assert.equal(await realpath(root), root);
  assert.equal(record.state, "complete");
  const attempt = logical(record.attemptId);
  assert.ok(!attempt.includes("/"));
  const output = resolve(root, logical(record.outputDirectory));
  assert.equal(await realpath(output), output);
  const state = `.stylex-next/${attempt}`;
  const postprocessing = artifact(record.postprocessing.delivery);
  const post = object(JSON.parse((await bytes(root, postprocessing.path, postprocessing)).toString()));
  assert.equal(post.attemptId, attempt);
  assert.equal(post.mode, "delivery");
  assert.equal(post.outputDirectory, record.outputDirectory);
  assert.deepEqual(post.graphs, record.delivery);
  const renames = new Map<string, Artifact>();
  assert.ok(Array.isArray(post.auxiliaryTraceSnapshots));
  for (const item of post.auxiliaryTraceSnapshots) {
    const rename = object(item).proxyRename;
    if (rename !== undefined) {
      const data = object(rename), initial = artifact(data.initial), final = artifact(data.output);
      assert.deepEqual([initial.path, final.path], ["server/proxy.js", "server/middleware.js"]);
      assert.deepEqual({ ...initial, path: final.path }, final);
      renames.set(initial.path, final);
    }
  }
  const maps = new Map<string, Artifact>();
  const sources = new Map<string, Artifact>();
  for (const identity of record.delivery) {
    const path = `${state}/delivery/${logical(identity.target)}/graph.json`;
    const data = await bytes(root, path);
    assert.equal(sha(data), identity.receiptSha256, "Graph receipt changed");
    const graph = object(JSON.parse(data.toString()));
    assert.deepEqual([graph.attemptId, graph.graphId, graph.mode, graph.target, graph.outputDirectory], [attempt, identity.graphId, "delivery", identity.target, record.outputDirectory]);
    assert.ok(Array.isArray(graph.sourceMaps) && Array.isArray(graph.outputs));
    const outputs = graph.outputs.map(artifact);
    for (const entry of graph.sourceMaps.map(artifact)) {
      assert.ok(entry.path.endsWith(".map"));
      const prior = maps.get(entry.path);
      if (prior) assert.deepEqual(prior, entry, "Targets disagree on a map");
      maps.set(entry.path, entry);
      const source = outputs.find(({ path: candidate }) => candidate === entry.path.slice(0, -4));
      assert.ok(source, "Map must have its compiled source");
      const priorSource = sources.get(source.path);
      if (priorSource) assert.deepEqual(priorSource, source);
      sources.set(source.path, source);
    }
  }
  assert.ok(maps.size > 0, "Configured source-map upload needs compiler maps");
  const before = await inventory(output);
  assert.deepEqual(before.filter(({ path }) => path.endsWith(".map")), [...maps.values()].sort((a, b) => a.path.localeCompare(b.path)), "Unknown, changed or missing delivery maps");
  const mapPaths = new Set([...maps.keys()].map((path) => join(output, path)));
  for (const entry of before.filter(({ path }) => path.endsWith(".nft.json"))) {
    const trace = object(JSON.parse((await bytes(output, entry.path, entry)).toString()));
    assert.ok(Array.isArray(trace.files) && trace.files.every((path) => typeof path === "string"));
    for (const file of trace.files) assert.ok(!mapPaths.has(resolve(dirname(join(output, entry.path)), file)), "Runtime file trace requires a private map");
  }
  const staging = `${state}/posthog-upload`;
  await mkdir(join(root, staging)); // Exclusive task-owned directory, never reused.
  const files: string[] = [];
  try {
    for (const [original, source] of sources) {
      const actual = renames.get(original) ?? source;
      const data = await bytes(output, actual.path, actual);
      const map = maps.get(`${original}.map`)!;
      const mapData = await bytes(output, map.path, map);
      if (!/\.[cm]?js$/u.test(original)) continue; // CSS maps are private but not exception symbols.
      const chunkId = determineChunkIdFromSource(data.toString());
      assert.ok(chunkId, `Missing injected chunk ID: ${original}`);
      assert.equal(object(JSON.parse(mapData.toString())).chunk_id, chunkId, "Map/chunk identity mismatch");
      const destination = join(root, staging, original);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, data, { flag: "wx" });
      await writeFile(`${destination}.map`, mapData, { flag: "wx" });
      files.push(destination);
    }
    assert.ok(files.length > 0);
    await upload(files); // Upload-only: production implementation must reject nonzero CLI exit.
    assert.deepEqual(await inventory(output), before, "Upload changed delivery bytes");
    for (const file of files) {
      const original = file.slice(join(root, staging).length + 1);
      await bytes(join(root, staging), original, sources.get(original)!);
      await bytes(join(root, staging), `${original}.map`, maps.get(`${original}.map`)!);
    }
    const receiptPath = `${state}/posthog-publication.json`;
    const receipt = { kind: "stripe-history-posthog-publication", schemaVersion: 1, compilerRecordSha256: sha(JSON.stringify(record)), compilerRecordPhase: "before-map-removal", uploadedJavascriptFiles: files.length, before, removedMaps: [...maps.values()], status: "uploaded-verified-before-map-removal" };
    await writeFile(join(root, receiptPath), JSON.stringify(receipt) + "\n", { flag: "wx" });
    for (const entry of maps.values()) {
      await bytes(output, entry.path, entry);
      await unlink(join(output, entry.path));
    }
    const after = await inventory(output);
    assert.deepEqual(after, before.filter(({ path }) => !path.endsWith(".map")), "Publication changed JavaScript or retained maps");
    await writeFile(join(root, receiptPath), JSON.stringify({ ...receipt, status: "complete", after }) + "\n");
    return receiptPath;
  } finally {
    assert.ok((await lstat(join(root, staging))).isDirectory());
    await rm(join(root, staging), { recursive: true });
  }
}
