import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertPatchedNextDelivery, bindNextTemplateCache } from "./next-template-cache";

const paths = ["patches/next@16.2.12.patch", "node_modules/next/dist/build/templates/app-page.js", "node_modules/next/dist/esm/build/templates/app-page.js"];
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "stripe-template-cache-")));
  for (const path of paths) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), path); }
  return root;
}

test("persistent template cache keeps existing policy but binds all three input bytes", async () => {
  const root = await fixture();
  try {
    const dependencies = { config: ["original-config"] };
    const input = { type: "filesystem", version: "original-next-version", buildDependencies: dependencies, name: "server", maxAge: 123 };
    const original = bindNextTemplateCache(input, root);
    expect(original).toEqual(bindNextTemplateCache(input, root));
    expect(original).not.toBe(input);
    expect(original).toMatchObject({ type: "filesystem", buildDependencies: dependencies, name: "server", maxAge: 123 });
    expect(typeof original === "object" && original.buildDependencies).toBe(dependencies);
    expect(input.version).toBe("original-next-version");
    const versions = new Set([JSON.stringify(original)]);
    for (const path of paths) {
      await writeFile(join(root, path), `${path}:changed`);
      versions.add(JSON.stringify(bindNextTemplateCache(input, root)));
      await writeFile(join(root, path), path);
    }
    expect(versions.size).toBe(4);
    expect(bindNextTemplateCache(input, root)).toEqual(original);
    expect(bindNextTemplateCache({ ...input, version: "different-next-version" }, root)).not.toEqual(original);
    for (const cache of [false, true, undefined, { type: "memory", maxGenerations: 5 }] as const) expect(bindNextTemplateCache(cache, "/absent-not-read")).toBe(cache);
  } finally { await rm(root, { recursive: true }); }
});

test("cache identity fails closed on missing, linked or non-file inputs", async () => {
  const root = await fixture();
  const path = join(root, paths[0]!);
  try {
    await rm(path);
    expect(() => bindNextTemplateCache({ type: "filesystem" }, root)).toThrow();
    await symlink(join(root, paths[1]!), path);
    expect(() => bindNextTemplateCache({ type: "filesystem" }, root)).toThrow("symlink");
    await rm(path);
    await mkdir(path);
    expect(() => bindNextTemplateCache({ type: "filesystem" }, root)).toThrow("ordinary");
  } finally { await rm(root, { recursive: true }); }
});

test("delivery proof distinguishes the actual expanded patched handler from stale cache", async () => {
  const root = await fixture();
  const path = join(root, ".next/server/app/page.js.map");
  await mkdir(dirname(path), { recursive: true });
  const start = "const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);";
  const patched = `${start}\nres.appendHeader('Vary', varyHeader);`;
  try {
    for (const sourcesContent of [[], [null], [patched.replace("appendHeader", "setHeader")], [patched, patched]]) {
      await writeFile(path, JSON.stringify({ sourcesContent }));
      expect(() => assertPatchedNextDelivery(root)).toThrow();
    }
    await writeFile(path, JSON.stringify({ sourcesContent: [null, "unrelated", patched] }));
    expect(() => assertPatchedNextDelivery(root)).not.toThrow();
  } finally { await rm(root, { recursive: true }); }
});
