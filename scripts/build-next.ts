import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runStylexNextBuild } from "@hraness/ui/stylex-build/next";
import { resolvePostHogSourceMapConfig } from "@hraness/posthog/next-config";
import { resolveConfig, runSourcemapCli } from "@posthog/plugin-utils";
import { publishPostHogMaps } from "./posthog-map-publication.ts";
import { stylexOptions } from "../stylex-config.ts";
import { assertPatchedNextDelivery } from "./next-template-cache.ts";
import { withVercelToolbarSource } from "./next-build-sources.ts";

assert.equal(process.release.name, "node");
assert.equal(process.versions.node.split(".")[0], "24", "Compiled builds require genuine Node 24.");
// The adapter invokes --webpack; declare the same backend to build plugins.
process.env.WEBPACK = "1";
const requiredSources = JSON.parse(await readFile(new URL("../stylex-sources.json", import.meta.url), "utf8"));
const record = await runStylexNextBuild({
  ...stylexOptions(process.cwd()),
  attemptId: `stripe-${randomUUID()}`,
  requiredSources: withVercelToolbarSource(requiredSources, process.env),
});
assertPatchedNextDelivery(process.cwd(), record);
const uploadOptions = resolvePostHogSourceMapConfig({ siteId: "stripe-history" });
let publicationReceipt: string | undefined;
if (uploadOptions) {
  // The supported webpack plugin injects IDs before compiler provenance is
  // recorded and may upload early, but it catches upload errors. Repeat its
  // upload-only command on the verified final bytes as the required success
  // gate. Existing chunk IDs make retries target the same symbol sets.
  // Private maps remain until compiler, native delivery and upload gates pass.
  const config = resolveConfig({ ...uploadOptions, sourcemaps: { ...uploadOptions.sourcemaps, deleteAfterUpload: false, releaseMode: "symbol-set" } });
  publicationReceipt = await publishPostHogMaps(process.cwd(), record, (filePaths) =>
    runSourcemapCli(config, { filePaths, command: "upload" }));
}
console.log(JSON.stringify({ kind: "stripe-history-compiled-build", record, publicationReceipt }));
