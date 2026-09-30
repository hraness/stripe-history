import assert from "node:assert/strict";
import type { runStylexNextBuild } from "@hraness/ui/stylex-build/next";
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

const inputs = [
  "patches/next@16.3.3.patch",
  "node_modules/next/dist/build/templates/app-page.js",
  "node_modules/next/dist/esm/build/templates/app-page.js",
  "node_modules/next/dist/build/templates/app-page-runtime.js",
  "node_modules/next/dist/esm/build/templates/app-page-runtime.js",
] as const;
type Cache = boolean | undefined | { type?: string; version?: string; [key: string]: unknown };
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

function ordinaryBytes(root: string, path: string, limit: number): Buffer {
  const absolute = join(root, path);
  assert.equal(realpathSync(absolute), absolute, "Template proof input traverses a symlink");
  const descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(descriptor);
    assert.ok(before.isFile() && before.size < limit, "Bounded ordinary template proof input required");
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    assert.equal(bytes.length, before.size);
    assert.deepEqual([after.dev, after.ino, after.size, after.mtimeMs, after.ctimeMs], [before.dev, before.ino, before.size, before.mtimeMs, before.ctimeMs], "Template input changed while reading");
    return bytes;
  } finally { closeSync(descriptor); }
}

/** Next's expanded virtual entry otherwise survives a dependency patch in its
 * persistent cache. Preserve Next/adapter options; namespace only its version. */
export function bindNextTemplateCache(cache: Cache, root: string): Cache {
  if (!cache || cache === true || cache.type !== "filesystem") return cache;
  assert.ok(cache.version === undefined || typeof cache.version === "string");
  const inventory = inputs.map((path) => ({ path, sha256: sha(ordinaryBytes(root, path, 2 * 1024 * 1024)) }));
  return { ...cache, version: JSON.stringify([cache.version ?? "", "stripe-next-vary-v2", sha(JSON.stringify(inventory))]) };
}

type DeliveryBuild = Pick<Awaited<ReturnType<typeof runStylexNextBuild>>, "attemptId" | "delivery" | "nextVersion" | "outputDirectory" | "state">;
function object(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), "Proof object required");
  return value as Record<string, unknown>;
}

/** Additional product proof after the complete adapter graph/map gate. Read back
 * that exact graph, then the root entry's actual JavaScript and maps. Next 16.3
 * delegates the handler to a shared runtime instead of expanding it inline. */
export function assertPatchedNextDelivery(root: string, record: DeliveryBuild): void {
  assert.equal(record.state, "complete");
  assert.equal(record.nextVersion, "16.3.3");
  assert.equal(record.outputDirectory, ".next");
  assert.match(record.attemptId, /^[a-zA-Z0-9_-]{1,128}$/u);
  const identities = record.delivery.filter(({ target }) => target === "node-rsc");
  assert.equal(identities.length, 1, "Exactly one completed node graph required");
  const identity = identities[0];
  assert.ok(identity);
  const bytes = ordinaryBytes(root, `.stylex-next/${record.attemptId}/delivery/node-rsc/graph.json`, 8 * 1024 * 1024);
  assert.equal(sha(bytes), identity.receiptSha256, "Delivery graph differs from the completed build");
  // The adapter validated the complete graph; parse its consumed fields again.
  const graph = object(JSON.parse(bytes.toString("utf8")));
  assert.deepEqual([graph.attemptId, graph.graphId, graph.mode, graph.nextVersion, graph.outputDirectory, graph.target],
    [record.attemptId, identity.graphId, "delivery", record.nextVersion, record.outputDirectory, "node-rsc"]);
  assert.ok(Array.isArray(graph.entrypoints) && graph.entrypoints.length <= 4096);
  assert.ok(Array.isArray(graph.outputs) && graph.outputs.length <= 16384);
  const outputs = graph.outputs.map(object);
  const entries = graph.entrypoints.map(object).filter(({ name }) => name === "app/page");
  assert.equal(entries.length, 1, "Exactly one root page entry required");
  const entry = entries[0];
  assert.ok(entry && Array.isArray(entry.javascript) && entry.javascript.length > 0 && entry.javascript.length <= 256);
  const javascript = entry.javascript.map((path: unknown) => { assert.ok(typeof path === "string"); return path; });
  assert.equal(new Set(javascript).size, javascript.length);
  assert.ok(javascript.includes("server/app/page.js"));
  let totalBytes = 0;
  const readOutput = (path: string): Buffer => {
    assert.ok(path.startsWith("server/") && !path.includes("\\") && !path.includes("\0")
      && path.split("/").every((part) => part !== "" && part !== "." && part !== ".."), "Noncanonical delivery output path");
    const artifacts = outputs.filter((artifact) => artifact.path === path);
    assert.equal(artifacts.length, 1, "Exactly one recorded delivery output required");
    const artifact = artifacts[0];
    assert.ok(artifact && typeof artifact.bytes === "number" && Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0);
    totalBytes += artifact.bytes;
    assert.ok(totalBytes <= 128 * 1024 * 1024, "Root delivery proof exceeds its byte budget");
    const content = ordinaryBytes(root, join(record.outputDirectory, path), 32 * 1024 * 1024);
    assert.equal(content.length, artifact.bytes, "Delivery output size changed");
    assert.equal(sha(content), artifact.sha256, "Delivery output bytes changed");
    return content;
  };
  const runtimes: string[] = [];
  for (const path of javascript) {
    assert.ok(path.endsWith(".js"));
    readOutput(path);
    const map = object(JSON.parse(readOutput(`${path}.map`).toString("utf8")));
    assert.equal(map.version, 3);
    assert.ok(Array.isArray(map.sources) && Array.isArray(map.sourcesContent));
    assert.ok(map.sourcesContent.length <= map.sources.length, "Map content has no corresponding source");
    if (path === "server/app/page.js") {
      const generated = map.sourcesContent.filter((source: unknown): source is string => typeof source === "string" && source.includes("createAppPageEntrypoint"));
      assert.equal(generated.length, 1, "Exactly one native expanded root entry required");
      const source = generated[0];
      assert.ok(source);
      assert.match(source, /import\s*\{\s*createAppPageEntrypoint\s*\}\s*from\s*["']next\/dist\/build\/templates\/app-page-runtime["']/u);
      assert.match(source, /const entrypoint\s*=\s*createAppPageEntrypoint\(/u);
      assert.match(source, /export const handler\s*=\s*entrypoint\.handler/u);
    }
    for (let index = 0; index < map.sources.length; index++) {
      const name: unknown = map.sources[index];
      const content: unknown = map.sourcesContent[index];
      if (typeof name === "string" && name.endsWith("/node_modules/next/dist/build/templates/app-page-runtime.js")) {
        assert.equal(typeof content, "string");
        if (typeof content === "string") runtimes.push(content);
      }
    }
  }
  assert.equal(runtimes.length, 1, "Exactly one reachable native app-page runtime required");
  assert.equal(sha(runtimes[0]!), "a408052bc3b76041c6e2664827f8f3fd35d470007a74d0f51327899f1817dc55", "Delivery must contain the exact patched Next runtime");
}
