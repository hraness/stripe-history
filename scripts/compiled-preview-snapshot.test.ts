import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPreviewSourcePath, previewSourceInventory, previewSourceKind } from "./compiled-preview-snapshot";

test("special-file metadata is rejected before any descriptor open", () => {
  const special = { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false };
  expect(() => previewSourceKind(special, "app/event-pipe")).toThrow("not an ordinary file");
});

test("protected env, provider and cache components are rejected at every depth", () => {
  for (const path of ["scripts/.env.local", "lib/nested/.env", "public/nested/.vercel/config.json", "assets/cache/object", "app/x/secrets.json", "support/.git/config"]) {
    expect(() => assertPreviewSourcePath(path)).toThrow("Protected or generated path");
  }
  expect(() => assertPreviewSourcePath("public/.well-known/security.txt")).not.toThrow();
  expect(() => assertPreviewSourcePath("lib/.well-known/security.txt")).toThrow();
});

test("snapshot rejects an authored symlink before following or reading its target", async () => {
  const root = await mkdtemp(join(tmpdir(), "stripe-preview-source-symlink-test-"));
  try {
    await mkdir(join(root, "app"));
    await symlink(join(root, "absent-target"), join(root, "app", "link.ts"));
    await expect(previewSourceInventory(root)).rejects.toThrow("must not be symlinks");
  } finally { await rm(root, { recursive: true }); }
});

test("nested env entry is refused before attempting to open it", async () => {
  const root = await mkdtemp(join(tmpdir(), "stripe-preview-source-protected-test-"));
  try {
    await mkdir(join(root, "app", "nested"), { recursive: true });
    // A dangling synthetic link proves the protected-name guard fires before
    // metadata/file access. No credential data is created or read.
    await symlink(join(root, "absent-target"), join(root, "app", "nested", ".env.local"));
    await expect(previewSourceInventory(root)).rejects.toThrow("Protected or generated path");
  } finally { await rm(root, { recursive: true }); }
});
