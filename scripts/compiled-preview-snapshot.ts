import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, open, readdir, readlink, realpath, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

const sourceTrees = ["app", "assets", "lib", "public", "scripts", "support"];
const sourceFiles = ["package.json", "bun.lock", "next.config.mjs", "next-config.ts", "proxy.ts", "stylex-config.ts", "stylex-sources.json", "tsconfig.json"];
type Source = Readonly<{ path: string; bytes: number; mode: number; sha256: string }>;
const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");

export function previewSourceKind(info: Pick<Stats, "isSymbolicLink" | "isDirectory" | "isFile">, path: string): "directory" | "file" {
  assert.ok(!info.isSymbolicLink(), `Preview sources must not be symlinks: ${path}`);
  if (info.isDirectory()) return "directory";
  assert.ok(info.isFile(), `Preview source is not an ordinary file: ${path}`);
  return "file";
}

/** No ignored credential, provider or cache subtree is an authored app input.
 * Fail before reading it; do not silently create an incomplete source copy.
 * The one authored dot-directory exception is public/.well-known. */
export function assertPreviewSourcePath(path: string): void {
  const segments = path.split("/");
  for (const [index, segment] of segments.entries()) {
    const wellKnown = index === 1 && segments[0] === "public" && segment === ".well-known";
    assert.ok((!segment.startsWith(".") || wellKnown) &&
      !["node_modules", "coverage", "cache", "caches", "dist", "build", "tmp", "temp"].includes(segment.toLowerCase()) &&
      !/^(?:credentials|secrets?)(?:[._-]|$)/iu.test(segment),
    `Protected or generated path is not a preview source: ${path}`);
  }
}

async function readOrdinarySource(root: string, path: string) {
  assertPreviewSourcePath(path);
  const absolute = join(root, path);
  assert.equal(await realpath(absolute), absolute, `Preview source path must not traverse a symlink: ${path}`);
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    assert.ok(info.isFile() && info.size < 64 * 1024 * 1024, `Preview source is not a bounded ordinary file: ${path}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assert.ok(bytes.length === info.size && after.size === info.size && after.mtimeMs === info.mtimeMs && after.ctimeMs === info.ctimeMs, `Preview source changed while reading: ${path}`);
    return { bytes, mode: info.mode & 0o777 };
  } finally { await handle.close(); }
}

export async function previewSourceInventory(root: string): Promise<Source[]> {
  const files: Source[] = [];
  async function visit(path: string): Promise<void> {
    assertPreviewSourcePath(path); // Before metadata traversal or file reads.
    const info = await lstat(join(root, path));
    if (previewSourceKind(info, path) === "directory") {
      for (const name of (await readdir(join(root, path))).sort()) await visit(`${path}/${name}`);
      return;
    }
    assert.ok(files.length < 20_000, "Preview source census exceeds its bound");
    const source = await readOrdinarySource(root, path);
    files.push({ path, bytes: source.bytes.length, mode: source.mode, sha256: sha(source.bytes) });
  }
  for (const path of [...sourceTrees, ...sourceFiles]) await visit(path);
  assert.ok(files.reduce((sum, file) => sum + file.bytes, 0) < 512 * 1024 * 1024, "Preview authored inputs exceed 512 MiB");
  return files.sort((a, b) => a.path.localeCompare(b.path, "en"));
}

export async function capturePreviewSnapshot(root: string, session: string): Promise<{ root: string; generation: string }> {
  const before = await previewSourceInventory(root);
  const target = await mkdtemp(join(session, "generation-"));
  const generation = randomUUID();
  for (const file of before) {
    const source = await readOrdinarySource(root, file.path);
    assert.equal(sha(source.bytes), file.sha256, `Source changed while snapshotting: ${file.path}; retry after edits settle`);
    assert.equal(source.mode, file.mode, `Source mode changed while snapshotting: ${file.path}`);
    await mkdir(join(target, file.path, ".."), { recursive: true });
    await writeFile(join(target, file.path), source.bytes, { flag: "wx", mode: file.mode });
  }
  assert.deepEqual(await previewSourceInventory(root), before, "Source census changed while snapshotting; old preview remains selected");
  const dependencies = join(root, "node_modules");
  assert.equal(await realpath(dependencies), dependencies, "Preview dependencies must belong to this ordinary checkout");
  await cp(dependencies, join(target, "node_modules"), {
    recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true,
    async filter(path) {
      const info = await lstat(path);
      assert.ok(info.isDirectory() || info.isFile() || info.isSymbolicLink(), "Unsupported dependency file type");
      if (info.isSymbolicLink()) {
        assert.ok(!isAbsolute(await readlink(path)), "Absolute dependency links cannot be copied into an isolated preview");
        const resolved = await realpath(path);
        const logical = relative(dependencies, resolved);
        assert.ok(logical !== ".." && !logical.startsWith("../") && !logical.startsWith("/"), "A dependency symlink escapes this installation");
      }
      return true;
    },
  });
  await writeFile(join(target, "preview-source-inventory.json"), JSON.stringify(before, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { root: target, generation };
}
