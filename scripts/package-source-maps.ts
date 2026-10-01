import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import type { runStylexNextBuild } from "@hraness/ui/stylex-build/next";

type Delivery = Pick<Awaited<ReturnType<typeof runStylexNextBuild>>, "attemptId" | "delivery" | "nextVersion" | "outputDirectory" | "state">;
type Artifact = { path: string; bytes: number; sha256: string };
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function object(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), "Expected proof object");
  return value as Record<string, unknown>;
}
function bytes(root: string, path: string, limit: number): Buffer {
  const absolute = join(root, path);
  assert.equal(realpathSync(absolute), absolute, "Packaging input traverses a symlink");
  const descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(descriptor);
    assert.ok(before.isFile() && before.size <= limit, "Packaging requires bounded ordinary files");
    const content = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    assert.equal(content.length, before.size);
    assert.deepEqual([after.dev, after.ino, after.size, after.mtimeMs, after.ctimeMs], [before.dev, before.ino, before.size, before.mtimeMs, before.ctimeMs], "Packaging input changed while reading");
    return content;
  } finally { closeSync(descriptor); }
}
function publicMaps(root: string): string[] {
  const found: string[] = [];
  let entries = 0;
  const visit = (path: string, depth: number) => {
    assert.ok(depth <= 32, "Static tree exceeds its depth budget");
    const absolute = join(root, ".next", path);
    assert.equal(realpathSync(absolute), absolute, "Static tree traverses a symlink");
    for (const name of readdirSync(absolute)) {
      assert.ok(++entries <= 32768, "Static tree exceeds its entry budget");
      const child = `${path}/${name}`;
      const stat = lstatSync(join(root, ".next", child));
      assert.ok(!stat.isSymbolicLink(), "Static tree contains a symlink");
      if (stat.isDirectory()) visit(child, depth + 1);
      else {
        assert.ok(stat.isFile(), "Static tree contains a special file");
        if (child.endsWith(".map")) found.push(child);
      }
    }
  };
  visit("static", 0);
  return found.sort();
}

/** Run only after compiler admission and assertPatchedNextDelivery. Preserve the
 * admitted JavaScript; package the exact public source maps out before Vercel
 * publishes static assets. Never delete discovery, server or unrecorded files. */
export function packageVerifiedClientMaps(root: string, record: Delivery) {
  assert.equal(resolve(root), root);
  assert.equal(realpathSync(root), root);
  assert.equal(record.state, "complete", "Compiler admission must finish before packaging");
  assert.equal(record.outputDirectory, ".next");
  assert.equal(record.nextVersion, "16.3.3");
  assert.match(record.attemptId, /^[a-zA-Z0-9_-]{1,128}$/u);
  const clients = record.delivery.filter(item => item.target === "client");
  assert.equal(clients.length, 1, "Exactly one admitted client graph required");
  const identity = clients[0]!;
  const graphBytes = bytes(root, `.stylex-next/${record.attemptId}/delivery/client/graph.json`, 8 * 1024 * 1024);
  assert.equal(sha(graphBytes), identity.receiptSha256, "Client graph changed after admission");
  const graph = object(JSON.parse(graphBytes.toString("utf8")));
  assert.deepEqual([graph.attemptId, graph.graphId, graph.mode, graph.nextVersion, graph.outputDirectory, graph.target],
    [record.attemptId, identity.graphId, "delivery", record.nextVersion, ".next", "client"]);
  assert.ok(Array.isArray(graph.outputs) && graph.outputs.length > 0 && graph.outputs.length <= 16384);
  let totalBytes = 0;
  const artifacts: Artifact[] = graph.outputs.map((value: unknown) => {
    const item = object(value);
    assert.ok(typeof item.path === "string" && !item.path.includes("\\") && !item.path.includes("\0")
      && item.path.split("/").every(part => part !== "" && part !== "." && part !== ".."), "Noncanonical client output path");
    assert.ok(typeof item.bytes === "number" && Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= 32 * 1024 * 1024);
    assert.ok(typeof item.sha256 === "string" && /^[a-f0-9]{64}$/u.test(item.sha256));
    totalBytes += item.bytes;
    assert.ok(totalBytes <= 256 * 1024 * 1024, "Client proof exceeds its byte budget");
    return { path: item.path, bytes: item.bytes, sha256: item.sha256 };
  });
  assert.equal(new Set(artifacts.map(item => item.path)).size, artifacts.length, "Duplicate client output path");
  const maps = artifacts.filter(item => item.path.startsWith("static/") && item.path.endsWith(".map"));
  assert.ok(maps.length > 0, "Admitted client maps required");
  const verify = (item: Artifact) => {
    const content = bytes(root, `.next/${item.path}`, 32 * 1024 * 1024);
    assert.equal(content.length, item.bytes, "Client output size changed after admission");
    assert.equal(sha(content), item.sha256, "Client output bytes changed after admission");
  };
  // Complete the entire dry run before the first deletion.
  artifacts.forEach(verify);
  assert.deepEqual(publicMaps(root), maps.map(item => item.path).sort(), "Unrecorded public source map");
  for (const item of maps) {
    verify(item);
    unlinkSync(join(root, ".next", item.path));
  }
  assert.deepEqual(publicMaps(root), [], "Public maps survived packaging");
  artifacts.filter(item => !maps.includes(item)).forEach(verify);
  return { kind: "stripe-history-source-map-packaging", attemptId: record.attemptId, clientGraphSha256: identity.receiptSha256,
    removed: maps, retainedClientOutputs: artifacts.length - maps.length, publicMapsRemaining: 0 };
}
