import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

const inputs = [
  "patches/next@16.2.12.patch",
  "node_modules/next/dist/build/templates/app-page.js",
  "node_modules/next/dist/esm/build/templates/app-page.js",
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
  return { ...cache, version: JSON.stringify([cache.version ?? "", "stripe-next-vary-v1", sha(JSON.stringify(inventory))]) };
}

/** Additional product proof after the complete adapter graph/map gate. The
 * root page's actual expanded entry, not an installed template, must be patched. */
export function assertPatchedNextDelivery(root: string): void {
  const map: unknown = JSON.parse(ordinaryBytes(root, ".next/server/app/page.js.map", 32 * 1024 * 1024).toString("utf8"));
  assert.ok(map && typeof map === "object" && "sourcesContent" in map && Array.isArray(map.sourcesContent));
  const entries: unknown[] = map.sourcesContent.filter((source: unknown) => typeof source === "string" && source.includes("const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);"));
  assert.equal(entries.length, 1, "Exactly one native expanded root app-page entry required");
  const [entry] = entries;
  assert.equal(typeof entry, "string");
  assert.ok(typeof entry === "string" && entry.split("res.appendHeader('Vary', varyHeader);").length === 2, "Delivery reused an unpatched native app-page entry");
  assert.ok(!entry.includes("res.setHeader('Vary', varyHeader);"), "Delivery retained the original Vary overwrite");
}
