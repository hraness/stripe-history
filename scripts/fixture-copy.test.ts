import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyOrdinaryFixtureTree, fixtureEntryKind } from "./fixture-copy";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const temporary = async () => {
  const root = await mkdtemp(join(tmpdir(), "stripe-fixture-copy-"));
  roots.push(root);
  return root;
};

// Independent synchronous reference avoids reusing the copy implementation.
function inventory(root: string, path = ""): unknown[] {
  const absolute = join(root, path);
  const info = lstatSync(absolute);
  const common = { path, mode: info.mode & 0o777 };
  if (info.isDirectory()) return [
    { ...common, kind: "directory" },
    ...readdirSync(absolute).sort().flatMap((name) => inventory(root, join(path, name))),
  ];
  expect(info.isFile()).toBe(true);
  const bytes = readFileSync(absolute);
  return [{ ...common, kind: "file", size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") }];
}

test("copies the complete real public corpus with identical paths, bytes and modes within the normal deadline", async () => {
  const root = await temporary();
  const source = join(import.meta.dir, "..", "public");
  const expected = inventory(source);
  const started = performance.now();
  await copyOrdinaryFixtureTree(source, join(root, "public"));
  expect(inventory(join(root, "public"))).toEqual(expected);
  console.log(JSON.stringify({ kind: "stripe-fixture-copy-proof", entries: expected.length, elapsedMs: performance.now() - started,
    manifestSha256: createHash("sha256").update(JSON.stringify(expected)).digest("hex") }));
});

test("retains empty directories, binary bytes and explicit executable/directory modes", async () => {
  const root = await temporary();
  const source = join(root, "source");
  await mkdir(join(source, "empty"), { recursive: true });
  await writeFile(join(source, "executable"), new Uint8Array([0, 255, 10, 128]));
  await chmod(join(source, "executable"), 0o751);
  await chmod(join(source, "empty"), 0o750);
  await copyOrdinaryFixtureTree(source, join(root, "copy"));
  expect(inventory(join(root, "copy"))).toEqual(inventory(source));
});

test("rejects nested source links before creating any destination and never overwrites an existing destination", async () => {
  const root = await temporary();
  const source = join(root, "source");
  await mkdir(source);
  await writeFile(join(source, "ordinary"), "original");
  await symlink("ordinary", join(source, "linked"));
  await expect(copyOrdinaryFixtureTree(source, join(root, "rejected"))).rejects.toThrow("symbolic links");
  expect(() => lstatSync(join(root, "rejected"))).toThrow();
  await rm(join(source, "linked"));
  await mkdir(join(root, "existing"));
  await writeFile(join(root, "existing", "ordinary"), "untouched");
  await expect(copyOrdinaryFixtureTree(source, join(root, "existing"))).rejects.toThrow("EEXIST");
  expect(readFileSync(join(root, "existing", "ordinary"), "utf8")).toBe("untouched");
});

test("rejects special-file metadata before opening a potentially blocking descriptor", () => {
  expect(() => fixtureEntryKind({ isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false })).toThrow("ordinary files");
});
