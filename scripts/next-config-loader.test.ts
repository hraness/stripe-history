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

test("the production phase resolves the configured production source-map wrapper into a config object", () => {
  const environment = { ...process.env };
  for (const key of ["VERCEL", "VERCEL_URL", "VERCEL_PROJECT_ID", "VERCEL_DEPLOYMENT_ID", "TURBOPACK"]) delete environment[key];
  Object.assign(environment, {
    VERCEL_ENV: "production",
    VERCEL_PROJECT_ID: "prj_fixture",
    VERCEL_DEPLOYMENT_ID: "dpl_fixture",
    VERCEL_GIT_COMMIT_SHA: "fbe959de6d5bd730d2c2edd9fd78377995bc8870",
    POSTHOG_API_KEY: "phx_test_not_a_real_credential",
    POSTHOG_PROJECT_ID: "543691",
    POSTHOG_UI_HOST: "https://us.posthog.com",
  });
  const result = spawnSync(process.execPath, ["--eval", `
    import assert from "node:assert/strict";
    import { mock } from "bun:test";
    // The compiler requires a build-attempt lease. Isolate only that unrelated
    // boundary; execute the real PostHog wrapper and production phase callback.
    mock.module("@hraness/ui/stylex-build/next", () => ({ withStylexNext: (config) => config }));
    const { default: configForPhase, createNextConfig } = await import("./next-config.ts");
    const config = await configForPhase("phase-production-build", { defaultConfig: {} });
    assert.equal(typeof config, "object");
    assert.equal(config.basePath, "/stripe");
    assert.equal(config.reactStrictMode, true);
    assert.equal(typeof config.webpack, "function");
    assert.notEqual(config.webpack, createNextConfig({}).webpack);
    assert.equal(typeof config.compiler, "object");
    console.log("configured-source-map-config-ok");
  `], { cwd: process.cwd(), env: environment, encoding: "utf8", timeout: 15_000, maxBuffer: 16_384 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("configured-source-map-config-ok");
});
