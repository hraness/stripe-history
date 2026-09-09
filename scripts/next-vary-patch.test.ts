import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { previewSourceInventory } from "./compiled-preview-snapshot";

const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const patchPath = "patches/next@16.2.12.patch";
const originalStatement = "res.setHeader('Vary', varyHeader);";
const patchedStatement = "res.appendHeader('Vary', varyHeader);";
const templates = [
  { path: "dist/build/templates/app-page.js", before: "4a5a857b99f9aa25f9960fc780f17be701b02794a682d78855e654167d93a262", after: "9796990767d3656b72b810679c0642d8a19285269cd0716c697322a3b97b3bb4", map: "425e3b5f7197e44aabe6b07a78e7112692b84e36b1c90dfdbd1d1ace5acb60f9" },
  { path: "dist/esm/build/templates/app-page.js", before: "dbe2e20d7183b106cd72f77073a7e9d17e4b4d324abada7b4d80ad51c8354ab2", after: "94eae627e2d90b982758669f57e9a9c2fee58b4207cf76cd71d26e74b4ca6d4e", map: "6fdfac460c2f0a7694e27c305f2976ca3aba2ff304edc1d312cdffb0c4045759" },
] as const;

test("the exact installed Next patch changes only the two declared template statements", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  const next = JSON.parse(await readFile("node_modules/next/package.json", "utf8"));
  expect(manifest.dependencies.next).toBe("16.2.12");
  expect(next.version).toBe("16.2.12");
  expect(manifest.patchedDependencies).toEqual({ "next@16.2.12": patchPath });
  const patch = await readFile(patchPath, "utf8");
  expect(patch.split("\n").filter((line) => line.startsWith("diff --git "))).toEqual(templates.map(({ path }) => `diff --git a/${path} b/${path}`));
  expect(patch.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"))).toEqual(templates.map(() => `+        ${patchedStatement}`));
  expect(patch.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"))).toEqual(templates.map(() => `-        ${originalStatement}`));
  for (const template of templates) {
    const source = await readFile(`node_modules/next/${template.path}`, "utf8");
    expect(sha(source)).toBe(template.after);
    expect(source.split(patchedStatement)).toHaveLength(2);
    expect(source).not.toContain(originalStatement);
    expect(sha(source.replace(patchedStatement, originalStatement))).toBe(template.before);
    // These unused upstream maps are retained, not claimed as patched-byte maps.
    // Native Next expands ESM text and webpack emits new maps under the adapter.
    expect(sha(await readFile(`node_modules/next/${template.path}.map`))).toBe(template.map);
  }
});

test("compiled-preview snapshots retain the exact declared dependency patch", async () => {
  const inventory = await previewSourceInventory(process.cwd());
  const patch = await readFile(patchPath);
  expect(inventory.filter(({ path }) => path.startsWith("patches/"))).toEqual([
    { path: patchPath, bytes: patch.length, mode: 0o644, sha256: sha(patch) },
  ]);
});

test("native Node responses retain existing Vary and every framework token from both templates", () => {
  const result = spawnSync(process.env.NODE_EXECUTABLE_PATH ?? "node", ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { createHash } from "node:crypto";
    import { IncomingMessage, ServerResponse } from "node:http";
    import { Socket } from "node:net";
    import { compileFunction } from "node:vm";
    import { createRequire } from "node:module";
    assert.equal(process.versions.node.split(".")[0], "24");
    assert.equal(Reflect.has(globalThis, "Bun"), false);
    const require = createRequire(import.meta.url);
    require("next/dist/server/node-environment.js");
    // This is the production runtime selected by Next's module.compiled entry.
    // Its unbundled source requires framework-only aliases unavailable in Node.
    const { AppPageRouteModule } = require("next/dist/compiled/next-server/app-page.runtime.prod.js");
    const { loadEntrypoint } = require("next/dist/build/load-entrypoint.js");
    const routeModule = Object.create(AppPageRouteModule.prototype);
    const templates = JSON.parse(process.argv[1]);
    const hash = (value) => createHash("sha256").update(value).digest("hex");
    const tokens = (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]).flatMap((entry) => entry.split(",").map((token) => token.trim().toLowerCase()));
    const priorValues = [undefined, "Accept", ["Accept", "Origin"], "Origin, aCcEpT", "Accept, Accept", "*", ["*", "Accept"]];
    let cases = 0;
    for (const template of templates) {
      const source = readFileSync("node_modules/next/" + template.path, "utf8");
      assert.equal(hash(source), template.after);
      const statement = "res.appendHeader('Vary', varyHeader);";
      assert.equal(source.split(statement).length, 2);
      const apply = compileFunction(statement, ["res", "varyHeader"]);
      const oldApply = compileFunction("res.setHeader('Vary', varyHeader);", ["res", "varyHeader"]);
      for (const intercepted of [false, true]) {
        const framework = routeModule.getVaryHeader("/stripe", intercepted ? [/^\\/stripe$/] : []);
        const expected = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", ...(intercepted ? ["next-url"] : [])];
        assert.deepEqual(tokens(framework), expected);
        for (const prior of priorValues) {
          const socket = new Socket();
          const response = new ServerResponse(new IncomingMessage(socket));
          try {
            if (prior !== undefined) response.setHeader("vArY", Array.isArray(prior) ? [...prior] : prior);
            apply(response, framework);
            assert.deepEqual(tokens(response.getHeader("Vary")), [...tokens(prior), ...expected]);
            if (prior !== undefined) {
              oldApply(response, framework);
              assert.deepEqual(tokens(response.getHeader("Vary")), expected);
              assert.notDeepEqual(tokens(response.getHeader("Vary")), [...tokens(prior), ...expected]);
            }
            cases++;
          } finally { response.destroy(); socket.destroy(); }
        }
      }
    }
    assert.equal(hash(readFileSync("node_modules/next/dist/build/load-entrypoint.js")), "7b7ef4b888ba375811fd1cc368292d93974d9c908334dfc460833cf7a30acc3d");
    // The synchronous native initializer cannot download a fallback or patch a
    // lockfile. It initializes the same installed binding used by the loader.
    const swc = require("next/dist/build/swc/index.js");
    swc.transformSync("", { filename: "vary-loader-proof.js" });
    assert.equal(swc.getBindingsSync().isWasm, false);
    const generated = await loadEntrypoint("app-page", { VAR_DEFINITION_PAGE: "app/page", VAR_DEFINITION_PATHNAME: "/stripe" }, {
      tree: "[]", __next_app_require__: "__webpack_require__", __next_app_load_chunk__: "() => Promise.resolve()"
    });
    assert.match(generated, /res\\.appendHeader\\(['"]Vary['"], varyHeader\\)/);
    assert.doesNotMatch(generated, /res\\.setHeader\\(['"]Vary['"], varyHeader\\)/);
    console.log(JSON.stringify({ cases, loader: "native-esm-template", node: process.versions.node }));
  `, JSON.stringify(templates)], { cwd: process.cwd(), encoding: "utf8", timeout: 15_000, maxBuffer: 65_536 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.cases).toBe(28);
  expect(receipt.loader).toBe("native-esm-template");
  expect(receipt.node).toMatch(/^24\./u);
});
