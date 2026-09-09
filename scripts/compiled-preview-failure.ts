import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { compilerSha256, createStylexTransformCollector } from "@hraness/ui/stylex-build";

const recipe = "app/site-footer.stylex.ts";
export const malformedRecipeSuffix = "\nexport const __previewBroken = ;\n";
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
};
const array = (value: unknown): unknown[] => { assert.ok(Array.isArray(value) && value.length <= 20_000); return value; };
const path = (value: unknown): string => {
  assert.ok(typeof value === "string" && /^[A-Za-z0-9_@()[\]./-]+$/u.test(value) &&
    !value.startsWith("/") && value.split("/").every((part) => part !== "" && part !== "." && part !== ".."));
  return value;
};

function ordinary(file: string): Buffer {
  assert.equal(realpathSync(file), file, "Failure evidence must not traverse symlinks");
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd);
    assert.ok(before.isFile() && before.size <= 16 * 1024 * 1024, "Failure evidence must be a bounded ordinary file");
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    assert.equal(bytes.length, before.size);
    assert.deepEqual([after.dev, after.ino, after.size, after.mtimeMs, after.ctimeMs], [before.dev, before.ino, before.size, before.mtimeMs, before.ctimeMs]);
    return bytes;
  } finally { closeSync(fd); }
}
const json = (file: string): unknown => JSON.parse(ordinary(file).toString("utf8"));
function absent(file: string): void {
  try { lstatSync(file); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error("Failed attempt unexpectedly published an output or completion artifact");
}

export function previewCompleteIdentity(root: string, generation: string) {
  assert.equal(realpathSync(root), root);
  assert.match(generation, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);
  const state = `.stylex-next/preview-${generation}`;
  return ["preview-complete.json", `${state}/complete.json`, `${state}/generated/stylex.css`,
    ".next/server/app/page.js", ".next/server/app/page.js.map"].map((path) => ({ path, sha256: sha(ordinary(join(root, path))) }));
}

/** This is only a negative canary proof, never a substitute for the adapter's
 * complete graph/map gate. Exactly one deliberately malformed recipe may lack
 * its loader receipt; all other captured inputs must have genuine receipts. */
export function validateFailedRecipeCensus(planValue: unknown, receiptValues: unknown[]): string[] {
  const plan = object(planValue);
  assert.equal(plan.kind, "hraness-stylex-next-attempt");
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.adapterVersion, "hraness-stylex-next-v2");
  assert.equal(plan.compilerSha256, compilerSha256);
  assert.equal(plan.nextVersion, "16.2.12");
  const required = array(object(plan.requiredSources)["node-rsc"]).map(path);
  assert.equal(new Set(required).size, required.length);
  assert.ok(required.includes(recipe));
  const actual = receiptValues.map((value) => {
    const receipt = object(value);
    for (const key of ["attemptId", "compilerSha256", "adapterVersion"]) assert.equal(receipt[key], plan[key]);
    assert.equal(receipt.kind, "hraness-stylex-next-module");
    assert.equal(receipt.schemaVersion, 1);
    assert.equal(receipt.mode, "discovery");
    assert.equal(receipt.graphId, "node-rsc");
    assert.equal(receipt.target, "node-rsc");
    return path(object(receipt.input).path);
  });
  assert.equal(new Set(actual).size, actual.length, "Duplicate loader source in failed attempt");
  assert.deepEqual([...actual].sort(), required.filter((entry) => entry !== recipe).sort(), "Failure must omit only the deliberately malformed recipe");
  return actual;
}

export async function proveMalformedPreviewAttempt(input: Readonly<{
  sourceRoot: string; session: unknown; failedRoot: unknown; failedGeneration: unknown;
  previousRoot: unknown; previousGeneration: unknown; authoredRecipe: string;
}>) {
  const { sourceRoot, session, failedRoot, failedGeneration, previousRoot, previousGeneration, authoredRecipe } = input;
  assert.equal(realpathSync(sourceRoot), sourceRoot);
  const stateRoot = join(sourceRoot, ".stylex-preview");
  assert.ok(typeof session === "string" && realpathSync(session) === session && dirname(session) === stateRoot &&
    /^session-[A-Za-z0-9]+$/u.test(session.slice(stateRoot.length + 1)), "Failed session must belong to the captured canary source");
  for (const root of [failedRoot, previousRoot]) {
    assert.ok(typeof root === "string" && realpathSync(root) === root && dirname(root) === session && /^generation-[A-Za-z0-9]+$/u.test(root.slice(session.length + 1)));
  }
  assert.ok(typeof failedRoot === "string" && typeof previousRoot === "string");
  assert.notEqual(failedRoot, previousRoot);
  for (const generation of [failedGeneration, previousGeneration]) assert.ok(typeof generation === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(generation));
  assert.notEqual(failedGeneration, previousGeneration);
  const attempt = join(failedRoot, ".stylex-next", `preview-${String(failedGeneration)}`);
  const previous = join(previousRoot, ".stylex-next", `preview-${String(previousGeneration)}`);
  assert.equal(realpathSync(attempt), attempt);
  const planBytes = ordinary(join(attempt, "plan.json"));
  const plan = object(JSON.parse(planBytes.toString("utf8")));
  const previousPlan = object(json(join(previous, "plan.json")));
  assert.equal(plan.attemptId, `preview-${String(failedGeneration)}`);
  assert.equal(previousPlan.attemptId, `preview-${String(previousGeneration)}`);
  assert.deepEqual({ ...plan, attemptId: previousPlan.attemptId }, previousPlan, "Only the attempt identity may change in the failed build plan");
  const broken = authoredRecipe + malformedRecipeSuffix;
  assert.equal(ordinary(join(previousRoot, recipe)).toString("utf8"), authoredRecipe);
  assert.equal(ordinary(join(failedRoot, recipe)).toString("utf8"), broken);
  const inventoryBytes = ordinary(join(failedRoot, "preview-source-inventory.json"));
  const inventory = array(JSON.parse(inventoryBytes.toString("utf8")));
  const priorInventory = array(json(join(previousRoot, "preview-source-inventory.json")));
  assert.equal(priorInventory.filter((entry) => object(entry).path === recipe).length, 1);
  assert.deepEqual(inventory, priorInventory.map((entry) => object(entry).path === recipe
    ? { ...object(entry), bytes: Buffer.byteLength(broken), sha256: sha(broken) } : entry), "Snapshot must differ only in the malformed recipe");
  let syntax: { code: string; reasonCode: string; pos: number } | undefined;
  try {
    await createStylexTransformCollector(failedRoot).transformWithMap(broken, join(failedRoot, recipe), { logicalSourceFileName: recipe });
  } catch (error) {
    const value = object(error);
    assert.equal(value.code, "BABEL_PARSE_ERROR");
    assert.equal(value.reasonCode, "UnexpectedToken");
    assert.ok(typeof value.pos === "number" && value.pos >= authoredRecipe.length && value.pos < broken.length);
    syntax = { code: "BABEL_PARSE_ERROR", reasonCode: "UnexpectedToken", pos: value.pos };
  }
  assert.ok(syntax, "The released compiler must reject the exact injected syntax");
  const modules = join(attempt, "discovery/node-rsc/modules");
  assert.equal(realpathSync(modules), modules);
  const names = readdirSync(modules).sort();
  assert.ok(names.length <= 20_000 && names.every((name) => /^[a-f0-9]{64}\.json$/u.test(name)));
  const receipts = names.map((name) => json(join(modules, name)));
  const paths = validateFailedRecipeCensus(plan, receipts);
  for (const [index, value] of receipts.entries()) {
    const receipt = object(value);
    const source = object(receipt.input);
    const bytes = ordinary(join(failedRoot, paths[index]!));
    assert.equal(names[index], `${sha(paths[index]!)}.json`);
    assert.equal(source.bytes, bytes.length);
    assert.equal(source.sha256, sha(bytes));
  }
  for (const entry of ["complete.json", "discovery/node-rsc/graph.json"]) absent(join(attempt, entry));
  for (const target of ["client", "node-rsc", "edge-rsc"]) {
    absent(join(attempt, "delivery", target, "graph.json"));
    const directory = join(attempt, "delivery", target, "modules");
    assert.equal(realpathSync(directory), directory);
    assert.deepEqual(readdirSync(directory), [], "Failed discovery must not reach delivery");
  }
  absent(join(failedRoot, "preview-complete.json"));
  return { sourceRoot, session, failedRoot, previousRoot, generation: failedGeneration, previousGeneration,
    planSha256: sha(planBytes), inventorySha256: sha(inventoryBytes),
    recipeSha256: sha(broken), compilerSha256, syntax, observedModules: paths.length, missing: [recipe] };
}
