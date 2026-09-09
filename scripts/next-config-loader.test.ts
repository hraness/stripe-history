import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("genuine Node 24 loads the native ESM config and retains the production policy", () => {
  const environment = { ...process.env };
  for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_PROJECT_ID", "VERCEL_DEPLOYMENT_ID", "VERCEL_GIT_COMMIT_SHA"]) delete environment[key];
  const result = spawnSync(environment.NODE_EXECUTABLE_PATH ?? "node", ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import configForPhase from "./next.config.mjs";
    import { createNextConfig } from "./next-config.ts";
    assert.equal(process.versions.node.split(".")[0], "24");
    assert.equal(Reflect.has(globalThis, "Bun"), false);
    const config = configForPhase("phase-production-server");
    assert.equal(config.basePath, "/stripe");
    assert.equal(config.webpack, createNextConfig({}).webpack);
    assert.equal(config.reactStrictMode, true);
    assert.ok((await config.headers()).some((entry) => entry.source === "/history/:category.yml"));
    assert.ok((await config.redirects()).some((entry) => entry.destination === "https://hraness.com/stripe"));
    assert.throws(() => configForPhase("phase-development-server"), /compiled preview/);
    console.log("native-esm-config-ok");
  `], { cwd: process.cwd(), env: environment, encoding: "utf8", timeout: 15_000, maxBuffer: 16_384 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("native-esm-config-ok");
});
