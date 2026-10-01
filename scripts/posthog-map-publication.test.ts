import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createChunkIdComment } from "@posthog/plugin-utils";
import { publishPostHogMaps } from "./posthog-map-publication.ts";

type Record = Parameters<typeof publishPostHogMaps>[1];
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const hash = (data: string) => createHash("sha256").update(data).digest("hex");
const identity = (path: string, data: string) => ({ path, bytes: Buffer.byteLength(data), sha256: hash(data) });
async function put(root: string, path: string, data: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), data);
}
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "stripe-posthog-map-test-"))); roots.push(root);
  const id = "11111111-1111-4111-8111-111111111111";
  const javascript = `console.log("compiled");${createChunkIdComment(id)}`;
  const map = JSON.stringify({ version: 3, chunk_id: id, sources: ["private.ts"], mappings: "" });
  const css = "body{}", cssMap = "{}";
  const state = ".stylex-next/test-build";
  const clientJs = identity("static/chunks/client.js", javascript);
  const clientMap = identity(`${clientJs.path}.map`, map);
  const serverJs = identity("server/proxy.js", javascript);
  const serverMap = identity(`${serverJs.path}.map`, map);
  const finalServer = { ...serverJs, path: "server/middleware.js" };
  const cssArtifact = identity("static/style.css", css), cssMapArtifact = identity("static/style.css.map", cssMap);
  for (const [path, content] of [[clientJs.path, javascript], [clientMap.path, map], [finalServer.path, javascript], [serverMap.path, map], [cssArtifact.path, css], [cssMapArtifact.path, cssMap], ["server/native.js", "// native generated"]] as const) await put(root, `.next/${path}`, content);
  const delivery = [];
  for (const [target, outputs, sourceMaps] of [
    ["client", [clientJs, clientMap, cssArtifact, cssMapArtifact], [clientMap, cssMapArtifact]],
    ["node-rsc", [serverJs, serverMap], [serverMap]],
  ] as const) {
    const graph = JSON.stringify({ attemptId: "test-build", graphId: target, mode: "delivery", target, outputDirectory: ".next", outputs, sourceMaps });
    await put(root, `${state}/delivery/${target}/graph.json`, graph);
    delivery.push({ target, graphId: target, receiptSha256: hash(graph) });
  }
  const post = JSON.stringify({ attemptId: "test-build", mode: "delivery", outputDirectory: ".next", graphs: delivery, auxiliaryTraceSnapshots: [{ proxyRename: { initial: serverJs, output: finalServer } }] });
  const postPath = `${state}/postprocessing.json`;
  await put(root, postPath, post);
  const record: Record = { kind: "hraness-stylex-next-build", attemptId: "test-build", outputDirectory: ".next", delivery, state: "complete", postprocessing: { delivery: identity(postPath, post), discovery: identity(postPath, post) } , adapterVersion: "hraness-stylex-next-v3", nextVersion: "16.3.3", compilerSha256: hash("compiler"), rulesSha256: hash("rules"), unionPolicySha256: hash("union"), finalCss: cssArtifact, packages: [], discovery: [], schemaVersion: 2 } satisfies Record;
  return { root, record, state, javascript, map, clientJs, clientMap, serverMap };
}

test("uploads all JS targets with original bytes, removes only proven maps, records private projection", async () => {
  const f = await fixture();
  let uploaded = 0;
  const receiptPath = await publishPostHogMaps(f.root, f.record, async (files) => {
    expect(files).toHaveLength(2);
    expect(files.some((path) => path.endsWith("/server/proxy.js"))).toBe(true);
    for (const file of files) {
      expect(await readFile(file, "utf8")).toBe(f.javascript);
      expect(await readFile(`${file}.map`, "utf8")).toBe(f.map);
    }
    uploaded++;
  });
  expect(uploaded).toBe(1);
  expect(await readFile(join(f.root, ".next/server/middleware.js"), "utf8")).toBe(f.javascript);
  expect(await readFile(join(f.root, ".next/static/style.css"), "utf8")).toBe("body{}");
  for (const map of [f.clientMap.path, f.serverMap.path, "static/style.css.map"]) expect(await Bun.file(join(f.root, ".next", map)).exists()).toBe(false);
  const receipt = JSON.parse(await readFile(join(f.root, receiptPath), "utf8"));
  expect(receipt.status).toBe("complete");
  expect(receipt.compilerRecordPhase).toBe("before-map-removal");
  expect(receipt.removedMaps).toHaveLength(3);
  expect(receipt.after.every(({ path }: { path: string }) => !path.endsWith(".map"))).toBe(true);
});

test("upload failure preserves all final maps and JavaScript", async () => {
  const f = await fixture();
  await expect(publishPostHogMaps(f.root, f.record, async () => { throw new Error("upload denied"); })).rejects.toThrow("upload denied");
  for (const map of [f.clientMap.path, f.serverMap.path]) expect(await readFile(join(f.root, ".next", map), "utf8")).toBe(f.map);
  expect(await readFile(join(f.root, ".next", f.clientJs.path), "utf8")).toBe(f.javascript);
  expect(await Bun.file(join(f.root, f.state, "posthog-publication.json")).exists()).toBe(false);
});

for (const mutate of ["before", "during", "staging", "unknown", "symlink", "escape", "trace"] as const) {
  test(`rejects ${mutate} tampering without map removal or outside mutation`, async () => {
    const f = await fixture();
    const outside = join(f.root, "outside.txt"); await writeFile(outside, "preserve");
    if (mutate === "before") await writeFile(join(f.root, ".next", f.clientJs.path), "changed");
    if (mutate === "unknown") await put(f.root, ".next/static/unknown.js.map", "unknown");
    if (mutate === "symlink") { await rm(join(f.root, ".next", f.clientMap.path)); await symlink(outside, join(f.root, ".next", f.clientMap.path)); }
    if (mutate === "trace") await put(f.root, ".next/server/native.js.nft.json", JSON.stringify({ version: 1, files: ["../static/chunks/client.js.map"] }));
    let uploadCalls = 0;
    if (mutate === "escape") f.record = { ...f.record, outputDirectory: "../escape" };
    await expect(publishPostHogMaps(f.root, f.record, async (files) => {
      uploadCalls++;
      if (mutate === "during") await writeFile(join(f.root, ".next", f.clientJs.path), "changed");
      if (mutate === "staging") await writeFile(files[0]!, "changed");
    })).rejects.toThrow();
    expect(await readFile(join(f.root, ".next", f.serverMap.path), "utf8")).toBe(f.map);
    expect(await readFile(outside, "utf8")).toBe("preserve");
    expect(uploadCalls).toBe(mutate === "during" || mutate === "staging" ? 1 : 0);
    expect(await Bun.file(join(f.root, f.state, "posthog-publication.json")).exists()).toBe(false);
  });
}
