import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";
import { setTimeout as wait } from "node:timers/promises";
import { chromium, type Browser, type BrowserContext, type BrowserServer } from "playwright-core";
import { capturePreviewSnapshot, previewSourceInventory } from "./compiled-preview-snapshot.ts";
import { loopbackListenerPresence, previewErrorEvidence, processPresence, terminalPreviewState } from "./compiled-preview-evidence.ts";
import { previewAcceptTypes, verifyPreviewRepresentation } from "./compiled-preview-representations.ts";

// Real product edit -> complete build -> owned restart -> manual refresh.
// Run the entire canary through both host/browser and repository schedulers.
type Event = Record<string, unknown> & { kind: string };
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const root = await realpath(process.cwd());
const stateRoot = join(root, ".stylex-preview");
await mkdir(stateRoot, { recursive: true, mode: 0o700 });
assert.equal(await realpath(stateRoot), stateRoot);
const evidenceRoot = await mkdtemp(join(stateRoot, "browser-proof-"));
const recipePath = "app/site-footer.stylex.ts";
const events: Event[] = [];
const errors: ReturnType<typeof previewErrorEvidence>[] = [];
const knownPids = new Set<number>();
const knownPorts = new Set<number>();
const representations: { generation: unknown; responses: ReturnType<typeof verifyPreviewRepresentation>[] }[] = [];
let stage = "preflight";
let workPassed = false;
let cleanupErrorsStart = 0;
let browser: Browser | undefined;
let browserServer: BrowserServer | undefined;
let context: BrowserContext | undefined;
let child: ChildProcess | undefined;
let childExited: Promise<void> | undefined;
let source: Awaited<ReturnType<typeof capturePreviewSnapshot>> | undefined;
let first: Event | undefined;
let second: Event | undefined;
let browserExecutableSha256: string | undefined;
let browserExecutableAfterSha256: string | undefined;
let sourceInventorySha256: string | undefined;
let sourceInventoryAfterSha256: string | undefined;
let authoredRecipeSha256: string | undefined;
let authoredRecipeAfterSha256: string | undefined;
let changedRecipeSha256: string | undefined;
let invalidRecipeSha256: string | undefined;
let browserVersion: string | undefined;
let executablePath: string | undefined;
let port: number | undefined;
let tail = "";
let cancelled = false;
const cancel = () => { cancelled = true; };
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
let contextClosed = false;
let browserCloseReturned = false;
let browserServerClosed = false;
let browserDisconnected = false;

// Numeric ownership only, never command lines or environment values.
async function observeOwnedDescendants(): Promise<void> {
  const result = await promisify(execFile)("/bin/ps", ["-axo", "pid=,ppid="], { timeout: 5000, maxBuffer: 2097152 });
  const rows = result.stdout.trim().split("\n").map((line) => line.trim().split(/\s+/u).map(Number));
  for (let added = true; added;) {
    added = false;
    for (const [pid, parent] of rows) {
      if (pid !== undefined && parent !== undefined && knownPids.has(parent) && !knownPids.has(pid)) { knownPids.add(pid); added = true; }
    }
  }
}
async function cleanupAttempt(label: string, operation: () => Promise<unknown>, deadlineMs = 10000): Promise<void> {
  try { await Promise.race([operation(), wait(deadlineMs, undefined, { ref: false }).then(() => { throw new Error("Bounded cleanup did not settle"); })]); }
  catch (error) { errors.push(previewErrorEvidence(label, error)); }
}
try {
  executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  assert.ok(executablePath, "Set CHROMIUM_EXECUTABLE_PATH to the reviewed browser executable");
  assert.ok((await lstat(executablePath)).isFile());
  browserExecutableSha256 = hash(await readFile(executablePath));
  const authoredRecipe = await readFile(join(root, recipePath), "utf8");
  authoredRecipeSha256 = hash(authoredRecipe);
  changedRecipeSha256 = hash(authoredRecipe.replace('rowGap: "0.5rem"', 'rowGap: "0.625rem"'));
  invalidRecipeSha256 = hash(authoredRecipe + "\nexport const __previewBroken = ;\n");
  assert.equal(authoredRecipe.split('rowGap: "0.5rem"').length, 2, "Real recipe edit must be unambiguous");
  sourceInventorySha256 = hash(JSON.stringify(await previewSourceInventory(root)));
  source = await capturePreviewSnapshot(root, evidenceRoot);
  assert.ok(!cancelled, "Preview cancelled before process startup");
  const reservation = createServer();
  try {
    await new Promise<void>((done, reject) => {
      reservation.once("error", reject);
      reservation.listen(0, "127.0.0.1", done);
    });
    const address = reservation.address();
    assert.ok(address && typeof address !== "string");
    port = address.port;
    knownPorts.add(port);
  } finally {
    if (reservation.listening) await new Promise<void>((done, reject) => reservation.close((error) => error ? reject(error) : done()));
  }
  const origin = `http://127.0.0.1:${port}`;
  const running = spawn(process.execPath, [join(source.root, "scripts/compiled-preview.ts"), String(port)], {
    cwd: source.root, env: process.env, stdio: ["pipe", "pipe", "pipe"], shell: false,
  });
  let childError: Error | undefined;
  running.on("error", (error) => { childError = error; });
  running.stdin.on("error", (error) => { childError = error; });
  child = running;
  const exited = new Promise<void>((done) => running.once("close", () => done()));
  childExited = exited;
  running.once("spawn", () => { if (running.pid !== undefined) knownPids.add(running.pid); });
  let buffer = "";
  let protocolError: Error | undefined;
  running.stdout.setEncoding("utf8");
  running.stderr.setEncoding("utf8");
  running.stderr.on("data", (data: string) => { tail = (tail + data).slice(-1_048_576); process.stderr.write(data); });
  running.stdout.on("data", (data: string) => {
    process.stdout.write(data);
    tail = (tail + data).slice(-1_048_576);
    if (protocolError) return;
    buffer += data;
    if (buffer.length >= 2_097_152) { protocolError = new Error("Preview protocol line exceeds its bound"); buffer = ""; return; }
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const value: unknown = JSON.parse(line);
        if (typeof value === "object" && value !== null && "kind" in value && typeof value.kind === "string") {
          if (events.length >= 1000) { protocolError = new Error("Preview event census exceeds its bound"); return; }
          const entry = value as Event;
          events.push(entry);
          if (entry.kind === "stripe-preview-owner-started") {
            if (Number.isInteger(entry.pid) && Number(entry.pid) > 0) knownPids.add(Number(entry.pid));
            if (Number.isInteger(entry.port) && Number(entry.port) > 0) knownPorts.add(Number(entry.port));
          }
        }
      } catch { /* Native Next progress is not protocol data. */ }
    }
  });
  async function event(kind: string, from: number): Promise<Event> {
    const deadline = Date.now() + 20 * 60_000;
    while (Date.now() < deadline) {
      if (cancelled) throw new Error("Compiled preview canary cancelled");
      if (protocolError) throw protocolError;
      for (const value of events.slice(from)) {
        if (value.kind === kind) return value;
        if (value.kind === "stripe-preview-build-failed") throw new Error(`Unexpected native build failure: ${JSON.stringify(value)}\n${tail}`);
      }
      if (childError) throw childError;
      assert.equal(running.exitCode, null, `Preview exited early\n${tail}`);
      await wait(100);
    }
    throw new Error(`Timed out waiting for ${kind}; preserve ${evidenceRoot}\n${tail}`);
  }
  stage = "browser-launch";
  browserServer = await chromium.launchServer({ executablePath, headless: true });
  const browserPid = browserServer.process().pid;
  if (browserPid !== undefined) knownPids.add(browserPid);
  browser = await chromium.connect(browserServer.wsEndpoint());
  browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  async function proveRepresentations(generation: unknown): Promise<void> {
    assert.ok(context);
    const responses: ReturnType<typeof verifyPreviewRepresentation>[] = [];
    for (const accept of previewAcceptTypes) {
      const response = await context.request.get(`${origin}/stripe`, { headers: { Accept: accept }, maxRedirects: 0, timeout: 30_000 });
      try {
        responses.push(verifyPreviewRepresentation(accept, { status: response.status(), headers: response.headers(), body: await response.text() }));
      } finally { await response.dispose(); }
    }
    representations.push({ generation, responses });
  }
  // Preserve the real Substack iframe markup without contacting third parties.
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  stage = "baseline-browser-assertions";
  first = await event("stripe-preview-ready", 0);
  await proveRepresentations(first.generation);
  await page.goto(`${origin}/stripe`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1#history-heading").textContent(), "Stripe’s history, dated and sourced");
  assert.ok(await page.locator(".history-event").count() >= 200, "Real async corpus must render");
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://hraness.com/stripe");
  assert.equal(await page.locator('iframe[title="subscribe to hraness on substack"]').getAttribute("src"), "https://hraness.substack.com/embed");
  assert.equal(await page.locator('.hraness-marketing-header__nav a').nth(1).getAttribute("href"), "/stripe/data");
  assert.equal(await page.locator('.hraness-marketing-header [data-presentation="menu"]').count(), 1);
  assert.equal(await page.locator('.stripe-history-evidence-strip time[datetime]').count(), 1);
  const resources = page.locator('.stripe-history-footer-resources');
  assert.equal(await resources.evaluate((node) => getComputedStyle(node).rowGap), "8px");
  assert.equal(await page.locator('.hraness-marketing-hero__copy').evaluate((node) => getComputedStyle(node).display), "grid");
  assert.equal(await page.locator('.hraness-marketing-hero__name').evaluate((node) => getComputedStyle(node).width), "1px");
  await page.locator("body").evaluate((node) => node.style.setProperty("--hraness-marketing-fact-columns", "1"));
  assert.equal((await page.locator('.hraness-marketing-stats__list').evaluate((node) => getComputedStyle(node).gridTemplateColumns)).split(" ").length, 4);
  await page.locator("body").evaluate((node) => node.style.removeProperty("--hraness-marketing-fact-columns"));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal((await page.locator('.hraness-marketing-stats__list').evaluate((node) => getComputedStyle(node).gridTemplateColumns)).split(" ").length, 2);
  await page.setViewportSize({ width: 1280, height: 900 });
  const identityUrl = `${origin}/stripe/__stripe_stylex_preview_generation.json`;
  const identity = await (await context.request.get(identityUrl)).json() as { generation: string };
  assert.equal(identity.generation, first.generation);

  stage = "expected-red-rebuild";
  // Expected red: invalidate the actual recipe in the isolated product source.
  await writeFile(join(source.root, recipePath), authoredRecipe + "\nexport const __previewBroken = ;\n");
  const beforeFailure = events.length;
  running.stdin.write("rebuild\n");
  const failure = await event("stripe-preview-build-failed", beforeFailure);
  assert.equal(failure.retained, events.find((value) => value.kind === "stripe-preview-candidate-complete")?.root);
  assert.match(tail, /__previewBroken|Expression expected|Unexpected token/u, "Expected failure must reach the deliberately invalid recipe");
  assert.equal((await (await context.request.get(identityUrl)).json() as { generation: string }).generation, first.generation);
  await proveRepresentations(first.generation);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await resources.evaluate((node) => getComputedStyle(node).rowGap), "8px");

  stage = "changed-recipe-rebuild";
  // Real product edit: new rules, fresh complete generation, new owned server.
  await writeFile(join(source.root, recipePath), authoredRecipe.replace('rowGap: "0.5rem"', 'rowGap: "0.625rem"'));
  const beforeSuccess = events.length;
  running.stdin.write("rebuild\n");
  second = await event("stripe-preview-ready", beforeSuccess);
  assert.notEqual(second.generation, first.generation);
  const complete = events.filter((value) => value.kind === "stripe-preview-candidate-complete");
  assert.equal(complete.length, 2);
  const firstRecord = complete[0]!.record as Record<string, unknown>;
  const secondRecord = complete[1]!.record as Record<string, unknown>;
  assert.equal(firstRecord.state, "complete");
  assert.equal(secondRecord.state, "complete");
  assert.notEqual(firstRecord.rulesSha256, secondRecord.rulesSha256);
  assert.deepEqual(firstRecord.packages, secondRecord.packages);
  assert.notEqual(complete[0]!.pid, complete[1]!.pid);
  assert.ok(events.some((value) => value.kind === "stripe-preview-owner-collected" && value.generation === first!.generation));
  // The old document remains until this explicit refresh. No HMR assertion.
  assert.equal(await resources.evaluate((node) => getComputedStyle(node).rowGap), "8px");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await resources.evaluate((node) => getComputedStyle(node).rowGap), "10px");
  assert.equal((await (await context.request.get(identityUrl)).json() as { generation: string }).generation, second.generation);
  await proveRepresentations(second.generation);
  assert.deepEqual(pageErrors, []);
  assert.equal(await readFile(join(root, recipePath), "utf8"), authoredRecipe, "The native canary must not edit the user's source checkout");

  workPassed = true;
} catch (error) {
  errors.push(previewErrorEvidence(stage, error));
} finally {
  cleanupErrorsStart = errors.length;
  await cleanupAttempt("pre-close-owned-process-census", observeOwnedDescendants);
  await cleanupAttempt("browser-context-close", async () => { await context?.close(); contextClosed = true; });
  await cleanupAttempt("browser-client-close", async () => { await browser?.close(); browserCloseReturned = true; });
  await cleanupAttempt("browser-server-close", async () => { await browserServer?.close(); browserServerClosed = true; });
  browserDisconnected = browser === undefined || !browser.isConnected();
  await cleanupAttempt("preview-command-close", async () => {
    if (child === undefined) return;
    if (child.exitCode === null && child.signalCode === null) child.stdin?.end("quit\n");
    let finished = await Promise.race([childExited!.then(() => true), wait(20000, undefined, { ref: false }).then(() => false)]);
    if (!finished) {
      child.kill("SIGTERM");
      finished = await Promise.race([childExited!.then(() => true), wait(20000, undefined, { ref: false }).then(() => false)]);
    }
    assert.ok(finished, "Preview did not collect; preserve output and diagnose owners");
    assert.equal(child.exitCode, 0, "Preview exit did not prove clean custody");
    assert.ok(events.some((value) => value.kind === "stripe-preview-collected" && value.ownedServers === 0 && value.proxyListening === false));
  }, 45000);
  await cleanupAttempt("browser-executable-postflight", async () => {
    if (executablePath === undefined || browserExecutableSha256 === undefined) return;
    browserExecutableAfterSha256 = hash(await readFile(executablePath));
    assert.equal(browserExecutableAfterSha256, browserExecutableSha256);
  });
  await cleanupAttempt("authored-source-postflight", async () => {
    if (authoredRecipeSha256 === undefined) return;
    authoredRecipeAfterSha256 = hash(await readFile(join(root, recipePath)));
    assert.equal(authoredRecipeAfterSha256, authoredRecipeSha256);
    if (sourceInventorySha256 !== undefined) {
      sourceInventoryAfterSha256 = hash(JSON.stringify(await previewSourceInventory(root)));
      assert.equal(sourceInventoryAfterSha256, sourceInventorySha256);
    }
  });
  process.off("SIGINT", cancel);
  process.off("SIGTERM", cancel);
}

// One terminal receipt after cleanup. A failed custody phase can never leave a
// durable complete marker even when all rendering assertions passed.
const processes = [...knownPids].sort((a, b) => a - b).map((pid) => ({ pid, presence: processPresence(pid) }));
const listeners = await Promise.all([...knownPorts].sort((a, b) => a - b).map(async (listenerPort) => ({ port: listenerPort, presence: await loopbackListenerPresence(listenerPort) })));
const custody = {
  contextClosed, browserCloseReturned, browserServerClosed, browserDisconnected,
  previewExitCode: child?.exitCode ?? null, previewSignalCode: child?.signalCode ?? null,
  processes, listeners, preview: events.filter((value) => value.kind === "stripe-preview-custody"),
};
const custodyPassed = contextClosed && browserCloseReturned && browserServerClosed && browserDisconnected &&
  processes.every((item) => item.presence === "absent") && listeners.every((item) => item.presence === "absent") &&
  errors.length === cleanupErrorsStart;
const state = terminalPreviewState(workPassed, custodyPassed);
const generations = events.filter((value) => value.kind === "stripe-preview-candidate-complete").map((value) => ({
  generation: value.generation, pid: value.pid, root: value.root, record: value.record, recordSha256: hash(JSON.stringify(value.record)),
}));
await writeFile(join(evidenceRoot, "browser-proof.json"), JSON.stringify({
  kind: "stripe-history-compiled-preview-proof", state,
  work: { state: workPassed ? "complete" : "failed", lastStage: stage, first, second },
  custody: { state: custodyPassed ? "complete" : "failed", ...custody },
  source: { root: source?.root ?? null, sourceInventorySha256, sourceInventoryAfterSha256, authoredRecipeSha256, authoredRecipeAfterSha256, changedRecipeSha256, invalidRecipeSha256 },
  browser: { version: browserVersion, executablePath, beforeSha256: browserExecutableSha256, afterSha256: browserExecutableAfterSha256 },
  generations, representations, errors,
  failedGenerations: events.filter((value) => value.kind === "stripe-preview-build-failed").map((value) => ({ retained: value.retained, session: value.session, diagnosticSha256: hash(String(value.message)) })),
  requiredAssertions: ["real async corpus", "canonical /stripe", "native HTML/Markdown/406 and Vary Accept before/after rebuild", "Substack markup", "header navigation/appearance", "semantic time", "desktop/mobile compiled orientation with inherited-variable counterexample", "failed generation preserves server/output", "changed rule union", "old server collected", "manual refresh observes real recipe edit", "authored checkout unchanged"],
  noHmrOrStateContinuityClaim: true,
}, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ kind: "stripe-preview-browser-terminal", state, evidenceRoot }));
if (state !== "complete") process.exitCode = 1;
