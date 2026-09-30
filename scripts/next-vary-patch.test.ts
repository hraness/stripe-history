import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { previewSourceInventory } from "./compiled-preview-snapshot";
import { stylexOptions } from "../stylex-config";

const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const patchPath = "patches/next@16.3.3.patch";
const originalStatement = "res.setHeader('Vary', varyHeader);";
const patchedStatement = "res.appendHeader('Vary', varyHeader);";
const templates = [
  { path: "dist/build/templates/app-page-runtime.js", before: "379ec94e6493f454cf8f21ead0bf43f366f911ba9f25b5e12e4fde0401dcca6e", after: "a408052bc3b76041c6e2664827f8f3fd35d470007a74d0f51327899f1817dc55", map: "56bfa27a88d9ad9a78da1b09d68a851e8898e1fe86f80f84d5cf01403063d840" },
  { path: "dist/esm/build/templates/app-page-runtime.js", before: "3d3338d5bbd34a298d14026b385ac782153ef36a5068849bdac96beff0fc4a29", after: "1293c2743fd57a0c50c1223f3f01109ff6e75c6d739d7911d545abbc26506f82", map: "3102b2e451dc90bec43eb47218297e0d5ea81497ac3e084e609de81cd1fa28e5" },
] as const;
const entries = [
  { path: "dist/build/templates/app-page.js", sha256: "91aed782b425996d1baea340a4b2752ca9397c8de19a8a67d36b3b5aa4fecb04", map: "88d12b97f7a80f93aec503d65f7d7a3ea6a991582fddf6c882a5abe4c4d76e24" },
  { path: "dist/esm/build/templates/app-page.js", sha256: "dda08235f21b762af2d7679916dc8c873996f566597fba60fdab86141027fbcc", map: "4555a464a76b6774ec69ad57a762cea9d9218b5239618d5ef054f176564a528e" },
] as const;

test("the exact installed Next patch changes only the two declared template statements", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  const next = JSON.parse(await readFile("node_modules/next/package.json", "utf8"));
  expect(manifest.dependencies.next).toBe("16.3.3");
  expect(next.version).toBe("16.3.3");
  expect(stylexOptions(process.cwd()).nextVersion).toBe(next.version);
  expect(manifest.patchedDependencies).toEqual({ "next@16.3.3": patchPath });
  const patch = await readFile(patchPath, "utf8");
  expect(patch.split("\n").filter((line) => line.startsWith("diff --git "))).toEqual(templates.map(({ path }) => `diff --git a/${path} b/${path}`));
  expect(patch.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"))).toEqual(templates.map(() => `+            ${patchedStatement}`));
  expect(patch.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"))).toEqual(templates.map(() => `-            ${originalStatement}`));
  for (const template of templates) {
    const source = await readFile(`node_modules/next/${template.path}`, "utf8");
    expect(sha(source)).toBe(template.after);
    expect(source.split(patchedStatement)).toHaveLength(2);
    expect(source).not.toContain(originalStatement);
    expect(sha(source.replace(patchedStatement, originalStatement))).toBe(template.before);
    // These unused upstream maps are retained, not claimed as patched-byte maps.
    // Native Next expands the ESM entry and webpack maps the imported runtime.
    expect(sha(await readFile(`node_modules/next/${template.path}.map`))).toBe(template.map);
  }
  for (const entry of entries) {
    expect(sha(await readFile(`node_modules/next/${entry.path}`))).toBe(entry.sha256);
    expect(sha(await readFile(`node_modules/next/${entry.path}.map`))).toBe(entry.map);
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
    // The pinned ESM entry now delegates its exported handler to a shared
    // runtime. Resolve the loader's actual import to one of the patched files.
    const runtimeImport = generated.match(/import\\s*\\{\\s*createAppPageEntrypoint\\s*\\}\\s*from\\s*["'](next\\/dist\\/(?:esm\\/)?build\\/templates\\/app-page-runtime(?:\\.js)?)["']/);
    assert.ok(runtimeImport, "Native entry must import the runtime factory");
    const runtimePath = require.resolve(runtimeImport[1]);
    const runtime = templates.find(({ path }) => require.resolve("next/" + path) === runtimePath);
    assert.ok(runtime, "Native entry must resolve a declared patched runtime");
    assert.equal(hash(readFileSync(runtimePath)), runtime.after);
    assert.match(generated, /const entrypoint\\s*=\\s*createAppPageEntrypoint\\(/);
    assert.match(generated, /export const handler\\s*=\\s*entrypoint\\.handler/);
    assert.doesNotMatch(generated, /res\\.setHeader\\(['"]Vary['"], varyHeader\\)/);
    console.log(JSON.stringify({ cases, loader: "native-esm-entry-runtime", runtime: runtime.path, node: process.versions.node }));
  `, JSON.stringify(templates)], { cwd: process.cwd(), encoding: "utf8", timeout: 15_000, maxBuffer: 65_536 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.cases).toBe(28);
  expect(receipt.loader).toBe("native-esm-entry-runtime");
  expect(templates.map(({ path }) => path)).toContain(receipt.runtime);
  expect(receipt.node).toMatch(/^24\./u);
}, 30_000);
