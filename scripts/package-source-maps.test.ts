import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { packageVerifiedClientMaps } from "./package-source-maps.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "stripe-map-package-")));
  const files = {
    "static/chunks/app.js": "window.fixture = true;\n//# sourceMappingURL=app.js.map",
    "static/chunks/app.js.map": '{"version":3,"sources":["app/page.tsx"],"sourcesContent":["private source"]}',
    "static/css/app.css": "a { color: blue }",
    "static/css/app.css.map": '{"version":3,"sources":["app/site.css"]}',
    "build-manifest.json": '{"pages":{}}',
  };
  const write = (path: string, content: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
  for (const [path, content] of Object.entries(files)) write(`.next/${path}`, content);
  write(".next/server/app.js.map", "private server map");
  write(".stylex-next/fixture/next-discovery/static/app.js.map", "discovery proof map");
  const graph = { attemptId: "fixture", graphId: "client", mode: "delivery", nextVersion: "16.3.3", outputDirectory: ".next", target: "client",
    outputs: Object.entries(files).map(([path, content]) => ({ path, bytes: Buffer.byteLength(content), sha256: sha(content) })) };
  const graphPath = ".stylex-next/fixture/delivery/client/graph.json";
  write(graphPath, JSON.stringify(graph));
  const record = { attemptId: "fixture", delivery: [{ target: "client" as const, graphId: "client", receiptSha256: sha(JSON.stringify(graph)) }],
    nextVersion: "16.3.3" as const, outputDirectory: ".next", state: "complete" as const };
  const saveGraph = () => { const text = JSON.stringify(graph); write(graphPath, text); record.delivery[0]!.receiptSha256 = sha(text); };
  return { root, files, write, graph, record, saveGraph, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test("packaging removes only admitted public maps after complete proof and preserves runtime bytes", () => {
  const f = fixture();
  try {
    const receipt = packageVerifiedClientMaps(f.root, f.record);
    expect(receipt.publicMapsRemaining).toBe(0);
    expect(receipt.removed.map(item => item.path)).toEqual(["static/chunks/app.js.map", "static/css/app.css.map"]);
    for (const [path, content] of Object.entries(f.files)) {
      if (path.endsWith(".map")) expect(existsSync(join(f.root, ".next", path))).toBe(false);
      else expect(readFileSync(join(f.root, ".next", path), "utf8")).toBe(content);
    }
    expect(readFileSync(join(f.root, ".next/server/app.js.map"), "utf8")).toBe("private server map");
    expect(readFileSync(join(f.root, ".stylex-next/fixture/next-discovery/static/app.js.map"), "utf8")).toBe("discovery proof map");
  } finally { f.dispose(); }
});

for (const failure of ["incomplete", "changed graph", "changed last map", "changed JavaScript", "unrecorded map", "traversal", "duplicate", "symlink file", "symlink parent"] as const) {
  test(`packaging rejects ${failure} before deleting any verified map`, () => {
    const f = fixture();
    try {
      if (failure === "incomplete") Object.assign(f.record, { state: "discovery" });
      if (failure === "changed graph") f.write(".stylex-next/fixture/delivery/client/graph.json", "{}");
      if (failure === "changed last map") f.write(".next/static/css/app.css.map", "changed");
      if (failure === "changed JavaScript") f.write(".next/static/chunks/app.js", "changed runtime");
      if (failure === "unrecorded map") f.write(".next/static/extra.js.map", "not admitted");
      if (failure === "traversal") { f.graph.outputs[0]!.path = "../outside.js"; f.saveGraph(); }
      if (failure === "duplicate") { f.graph.outputs.push(f.graph.outputs[0]!); f.saveGraph(); }
      if (failure === "symlink file") {
        f.write("outside-map", f.files["static/css/app.css.map"]);
        rmSync(join(f.root, ".next/static/css/app.css.map"));
        symlinkSync(join(f.root, "outside-map"), join(f.root, ".next/static/css/app.css.map"));
      }
      if (failure === "symlink parent") {
        f.write("outside-css/app.css", f.files["static/css/app.css"]);
        f.write("outside-css/app.css.map", f.files["static/css/app.css.map"]);
        rmSync(join(f.root, ".next/static/css"), { recursive: true });
        symlinkSync(join(f.root, "outside-css"), join(f.root, ".next/static/css"));
      }
      expect(() => packageVerifiedClientMaps(f.root, f.record)).toThrow();
      expect(readFileSync(join(f.root, ".next/static/chunks/app.js.map"), "utf8")).toBe(f.files["static/chunks/app.js.map"]);
    } finally { f.dispose(); }
  });
}
