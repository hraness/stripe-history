import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compilerSha256 } from "@hraness/ui/stylex-build";
import { malformedRecipeSuffix, proveMalformedPreviewAttempt, validateFailedRecipeCensus } from "./compiled-preview-failure";

const recipe = "app/site-footer.stylex.ts";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const firstId = "11111111-1111-4111-8111-111111111111";
const failedId = "22222222-2222-4222-8222-222222222222";
const plan = (id = failedId) => ({ kind: "hraness-stylex-next-attempt", schemaVersion: 2,
  adapterVersion: "hraness-stylex-next-v2", compilerSha256, nextVersion: "16.2.12",
  attemptId: `preview-${id}`, requiredSources: { "node-rsc": ["app/other.ts", recipe] } });
const receipt = (path = "app/other.ts") => ({ kind: "hraness-stylex-next-module", schemaVersion: 1,
  adapterVersion: "hraness-stylex-next-v2", compilerSha256, attemptId: `preview-${failedId}`,
  mode: "discovery", graphId: "node-rsc", target: "node-rsc",
  input: { path, bytes: Buffer.byteLength("export const other = true;"), sha256: sha("export const other = true;") } });

test("only the exact sole malformed recipe may lack a loader receipt", () => {
  expect(validateFailedRecipeCensus(plan(), [receipt()])).toEqual(["app/other.ts"]);
  for (const receipts of [[], [receipt(), receipt()], [receipt(), receipt(recipe)], [receipt("app/extra.ts")]]) {
    expect(() => validateFailedRecipeCensus(plan(), receipts)).toThrow();
  }
  for (const [key, value] of [["attemptId", "stale"], ["compilerSha256", "stale"], ["mode", "delivery"],
    ["target", "client"], ["graphId", "client"], ["kind", "foreign"], ["schemaVersion", 2]]) {
    expect(() => validateFailedRecipeCensus(plan(), [{ ...receipt(), [String(key)]: value }])).toThrow();
  }
  for (const path of ["../escape", "/absolute", "app//other.ts", "app/./other.ts"]) {
    expect(() => validateFailedRecipeCensus(plan(), [receipt(path)])).toThrow();
  }
  expect(() => validateFailedRecipeCensus({ ...plan(), nextVersion: "16.3.3" }, [receipt()])).toThrow();
  expect(() => validateFailedRecipeCensus({ ...plan(), requiredSources: { "node-rsc": [recipe, recipe] } }, [])).toThrow();
});

async function fixture() {
  const sourceRoot = await realpath(await mkdtemp(join(tmpdir(), "stripe-failed-recipe-test-")));
  const session = join(sourceRoot, ".stylex-preview/session-test");
  const previousRoot = join(session, "generation-good");
  const failedRoot = join(session, "generation-bad");
  const authoredRecipe = await readFile(new URL("../app/site-footer.stylex.ts", import.meta.url), "utf8");
  const file = async (path: string, text: string) => { await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, text); };
  const attempt = join(failedRoot, ".stylex-next", `preview-${failedId}`);
  for (const [root, id, source] of [[previousRoot, firstId, authoredRecipe], [failedRoot, failedId, authoredRecipe + malformedRecipeSuffix]]) {
    await file(join(root!, recipe), source!);
    await file(join(root!, "app/other.ts"), "export const other = true;");
    await file(join(root!, "preview-source-inventory.json"), JSON.stringify([{ path: recipe, bytes: Buffer.byteLength(source!), mode: 420, sha256: sha(source!) }]));
    await file(join(root!, ".stylex-next", `preview-${id}`, "plan.json"), JSON.stringify(plan(id)));
  }
  await file(join(attempt, "discovery/node-rsc/modules", `${sha("app/other.ts")}.json`), JSON.stringify(receipt()));
  for (const target of ["client", "node-rsc", "edge-rsc"]) await mkdir(join(attempt, "delivery", target, "modules"), { recursive: true });
  return { sourceRoot, session, attempt, failedRoot, file, input: { sourceRoot, session, failedRoot, previousRoot, failedGeneration: failedId, previousGeneration: firstId, authoredRecipe } };
}

test("structured negative proof binds exact malformed source, snapshot, plan and native census", async () => {
  const value = await fixture();
  try {
    const proof = await proveMalformedPreviewAttempt(value.input);
    expect(proof.missing).toEqual([recipe]);
    expect(proof.observedModules).toBe(1);
    expect(proof.syntax.code).toBe("BABEL_PARSE_ERROR");
    expect(proof.recipeSha256).toBe(sha(value.input.authoredRecipe + malformedRecipeSuffix));
    await value.file(join(value.failedRoot, recipe), value.input.authoredRecipe);
    await expect(proveMalformedPreviewAttempt(value.input)).rejects.toThrow();
  } finally { await rm(value.sourceRoot, { recursive: true, force: true }); }
});

for (const mutation of ["complete", "delivery", "extra-receipt", "source-drift", "snapshot-drift", "symlink", "wrong-generation", "foreign-source-root", "foreign-session"] as const) {
  test(`expected failure rejects ${mutation} rather than accepting an arbitrary build red`, async () => {
    const value = await fixture();
    try {
      if (mutation === "complete") await value.file(join(value.attempt, "complete.json"), "{}");
      if (mutation === "delivery") await value.file(join(value.attempt, "delivery/client/modules", `${sha("extra")}.json`), "{}");
      if (mutation === "extra-receipt") await value.file(join(value.attempt, "discovery/node-rsc/modules", `${sha("app/extra.ts")}.json`), JSON.stringify(receipt("app/extra.ts")));
      if (mutation === "source-drift") await value.file(join(value.failedRoot, "app/other.ts"), "export const other = false;");
      if (mutation === "snapshot-drift") await value.file(join(value.failedRoot, "preview-source-inventory.json"), "[]");
      if (mutation === "symlink") {
        await rm(join(value.failedRoot, recipe));
        await symlink(join(value.input.previousRoot, recipe), join(value.failedRoot, recipe));
      }
      await expect(proveMalformedPreviewAttempt({ ...value.input,
        sourceRoot: mutation === "foreign-source-root" ? value.input.previousRoot : value.sourceRoot,
        session: mutation === "foreign-session" ? value.sourceRoot : value.session,
        failedGeneration: mutation === "wrong-generation" ? firstId : failedId })).rejects.toThrow();
    } finally { await rm(value.sourceRoot, { recursive: true, force: true }); }
  });
}
