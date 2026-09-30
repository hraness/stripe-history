import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertPatchedNextDelivery, bindNextTemplateCache } from "./next-template-cache";

const paths = [
  "patches/next@16.3.3.patch",
  "node_modules/next/dist/build/templates/app-page.js",
  "node_modules/next/dist/esm/build/templates/app-page.js",
  "node_modules/next/dist/build/templates/app-page-runtime.js",
  "node_modules/next/dist/esm/build/templates/app-page-runtime.js",
];
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "stripe-template-cache-")));
  for (const path of paths) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), path); }
  return root;
}

test("persistent template cache keeps existing policy but binds all five input bytes", async () => {
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
    expect(versions.size).toBe(6);
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

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const expandedEntry = 'import { createAppPageEntrypoint } from "next/dist/build/templates/app-page-runtime";\nconst entrypoint = createAppPageEntrypoint({});\nexport const handler = entrypoint.handler;';
type DeliveryOptions = {
  unpatched?: boolean; unrelated?: boolean; duplicateRuntime?: boolean; wrongImport?: boolean; externalSource?: boolean; staleCompiledRuntime?: boolean;
  graph?: Record<string, unknown>; record?: Record<string, unknown>;
};
async function deliveryFixture(options: DeliveryOptions = {}) {
  const root = await fixture();
  const original = await readFile(new URL("../node_modules/next/dist/build/templates/app-page-runtime.js", import.meta.url), "utf8");
  const runtime = options.unpatched ? original.replace("res.appendHeader('Vary', varyHeader);", "res.setHeader('Vary', varyHeader);") : original;
  const name = "webpack://fixture/./node_modules/next/dist/build/templates/app-page-runtime.js";
  const files = new Map([
    ["server/app/page.js", "compiled root JavaScript"],
    ["server/app/page.js.map", JSON.stringify({ version: 3, sources: ["webpack://fixture/?entry"], sourcesContent: [options.wrongImport ? expandedEntry.replace("app-page-runtime", "unpatched-runtime") : expandedEntry] })],
    ["server/chunks/runtime.js", options.staleCompiledRuntime ? 'function runtime(res,varyHeader){res.setHeader("Vary",varyHeader)}' : 'function runtime(res,varyHeader){res.appendHeader("Vary",varyHeader)}'],
    ["server/chunks/runtime.js.map", JSON.stringify({ version: 3, sources: options.duplicateRuntime ? [name, name] : options.externalSource ? [name, "webpack://fixture/external-bootstrap"] : [name], sourcesContent: options.duplicateRuntime ? [runtime, runtime] : [runtime] })],
  ]);
  for (const [path, source] of files) {
    await mkdir(dirname(join(root, ".next", path)), { recursive: true });
    await writeFile(join(root, ".next", path), source);
  }
  const graph = {
    attemptId: "fixture", graphId: "node-rsc", mode: "delivery", nextVersion: "16.3.3", outputDirectory: ".next", target: "node-rsc",
    entrypoints: [{ name: "app/page", javascript: options.unrelated ? ["server/app/page.js"] : ["server/app/page.js", "server/chunks/runtime.js"] }],
    outputs: [...files].map(([path, source]) => ({ bytes: Buffer.byteLength(source), path, sha256: digest(source) })),
    ...options.graph,
  };
  const graphPath = join(root, ".stylex-next/fixture/delivery/node-rsc/graph.json");
  await mkdir(dirname(graphPath), { recursive: true });
  const graphBytes = JSON.stringify(graph);
  await writeFile(graphPath, graphBytes);
  const record = {
    attemptId: "fixture", delivery: [{ graphId: "node-rsc", target: "node-rsc", receiptSha256: digest(graphBytes) }],
    nextVersion: "16.3.3", outputDirectory: ".next", state: "complete", ...options.record,
  } as Parameters<typeof assertPatchedNextDelivery>[1];
  return { root, record, graphPath };
}

test("delivery proof follows the completed root graph to its patched shared runtime", async () => {
  const { root, record } = await deliveryFixture();
  try { expect(() => assertPatchedNextDelivery(root, record)).not.toThrow(); }
  finally { await rm(root, { recursive: true }); }
});

test("delivery maps may omit text for external sources but must contain the runtime", async () => {
  const { root, record } = await deliveryFixture({ externalSource: true });
  try { expect(() => assertPatchedNextDelivery(root, record)).not.toThrow(); }
  finally { await rm(root, { recursive: true }); }
});

for (const [name, options] of [
  ["unreachable runtime, even when present elsewhere in the graph", { unrelated: true }],
  ["stale unpatched runtime", { unpatched: true }],
  ["patched map paired with stale compiled runtime", { staleCompiledRuntime: true }],
  ["duplicated runtime", { duplicateRuntime: true }],
  ["entry importing another runtime", { wrongImport: true }],
  ["discovery graph", { graph: { mode: "discovery" } }],
  ["another attempt's graph", { graph: { attemptId: "old-attempt" } }],
  ["another target's graph", { graph: { target: "client" } }],
  ["missing root entry", { graph: { entrypoints: [] } }],
  ["traversing output path", { graph: { entrypoints: [{ name: "app/page", javascript: ["server/app/page.js", "server/../escape.js"] }] } }],
  ["unfinished build", { record: { state: "discovery" } }],
  ["wrong Next profile", { record: { nextVersion: "16.2.12" } }],
  ["traversing attempt path", { record: { attemptId: "../escape" } }],
] satisfies readonly (readonly [string, DeliveryOptions])[]) {
  test(`delivery proof rejects ${name}`, async () => {
    const { root, record } = await deliveryFixture(options);
    try { expect(() => assertPatchedNextDelivery(root, record)).toThrow(); }
    finally { await rm(root, { recursive: true }); }
  });
}

for (const target of ["graph", "server/app/page.js", "server/app/page.js.map", "server/chunks/runtime.js", "server/chunks/runtime.js.map"]) {
  test(`delivery proof rejects ${target} changed after the completed record`, async () => {
    const { root, record, graphPath } = await deliveryFixture();
    try {
      const path = target === "graph" ? graphPath : join(root, ".next", target);
      await writeFile(path, (await readFile(path, "utf8")) + " ");
      expect(() => assertPatchedNextDelivery(root, record)).toThrow();
    } finally { await rm(root, { recursive: true }); }
  });
}

test("delivery proof rejects a linked output even when its bytes match", async () => {
  const { root, record } = await deliveryFixture();
  try {
    const path = join(root, ".next/server/chunks/runtime.js");
    const copy = join(root, "runtime-copy.js");
    await writeFile(copy, await readFile(path));
    await rm(path);
    await symlink(copy, path);
    expect(() => assertPatchedNextDelivery(root, record)).toThrow("symlink");
  } finally { await rm(root, { recursive: true }); }
});
