import assert from "node:assert/strict";
import { constants, type Stats } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

type Entry = { path: string; mode: number } & (
  | { kind: "directory" }
  | { kind: "file"; bytes: Buffer; sha256: string }
);

export function fixtureEntryKind(info: Pick<Stats, "isSymbolicLink" | "isDirectory" | "isFile">): "directory" | "file" {
  assert.ok(!info.isSymbolicLink(), "Fixture source must not contain symbolic links");
  if (info.isDirectory()) return "directory";
  assert.ok(info.isFile(), "Fixture source must contain only ordinary files and directories");
  return "file";
}

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Test setup only: Bun's recursive async cp is slow under the admitted worker
 * budgets on macOS. Sequential ordinary-file IO preserves the entire fixture,
 * while descriptor checks reject links/special files before reading bytes. */
export async function copyOrdinaryFixtureTree(source: string, destination: string): Promise<void> {
  const entries: Entry[] = [];
  async function capture(path: string): Promise<void> {
    const absolute = join(source, path);
    const before = await lstat(absolute);
    const kind = fixtureEntryKind(before);
    const mode = before.mode & 0o777;
    if (kind === "directory") {
      entries.push({ path, mode, kind });
      for (const name of (await readdir(absolute)).sort()) await capture(join(path, name));
      return;
    }
    const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const opened = await handle.stat();
      assert.equal(fixtureEntryKind(opened), "file");
      assert.equal(opened.ino, before.ino);
      assert.equal(opened.dev, before.dev);
      const bytes = await handle.readFile();
      const after = await handle.stat();
      assert.equal(after.size, bytes.byteLength);
      assert.equal(after.mtimeMs, opened.mtimeMs);
      assert.equal(after.mode, before.mode);
      entries.push({ path, mode, kind, bytes, sha256: hash(bytes) });
    } finally { await handle.close(); }
  }
  assert.equal(fixtureEntryKind(await lstat(source)), "directory");
  // Complete preflight precedes destination creation; never filter the corpus.
  await capture("");
  for (const entry of entries) {
    const absolute = join(destination, entry.path);
    if (entry.kind === "directory") await mkdir(absolute, { mode: 0o700 });
    else {
      await writeFile(absolute, entry.bytes, { flag: "wx", mode: 0o600 });
      assert.equal(hash(await readFile(absolute)), entry.sha256, "Fixture copy must preserve every source byte");
    }
  }
  // Set modes last so read-only source directories remain writable during copy.
  for (const entry of entries.toReversed()) {
    const absolute = join(destination, entry.path);
    await chmod(absolute, entry.mode);
    assert.equal((await lstat(absolute)).mode & 0o777, entry.mode, "Fixture copy must preserve every source mode");
  }
}
