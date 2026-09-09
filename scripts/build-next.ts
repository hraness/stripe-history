import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runStylexNextBuild } from "@hraness/ui/stylex-build/next";
import { stylexOptions } from "../stylex-config.ts";
import { assertPatchedNextDelivery } from "./next-template-cache.ts";

assert.equal(process.release.name, "node");
assert.equal(process.versions.node.split(".")[0], "24", "Compiled builds require genuine Node 24.");
const requiredSources = JSON.parse(await readFile(new URL("../stylex-sources.json", import.meta.url), "utf8"));
const record = await runStylexNextBuild({
  ...stylexOptions(process.cwd()),
  attemptId: `stripe-${randomUUID()}`,
  requiredSources,
});
assertPatchedNextDelivery(process.cwd());
console.log(JSON.stringify({ kind: "stripe-history-compiled-build", record }));
