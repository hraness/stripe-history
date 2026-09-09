import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { createServer, request, type Server } from "node:http";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import { runStylexNextBuild } from "@hraness/ui/stylex-build/next";
import { stylexOptions } from "../stylex-config.ts";
import { collectPreviewOwner, createPreviewCommands, createPreviewSelection, hasUnprovedPreviewCustody } from "./compiled-preview-state.ts";
import { capturePreviewSnapshot } from "./compiled-preview-snapshot.ts";
import { assertPatchedNextDelivery } from "./next-template-cache.ts";

// This is production rebuild/start/manual-refresh, not HMR. Each attempt has a
// new application root, so unproved type files from a failed build never enter
// the next attempt. Source, successful output and failed evidence are retained.
const identityPath = "__stripe_stylex_preview_generation.json";
type Backend = Readonly<{ child: ChildProcess; port: number; generation: string; root: string }>;
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const diagnostic = (value: Record<string, unknown>) => console.log(JSON.stringify(value));

function groupExists(child: ChildProcess): boolean {
  if (child.pid === undefined) return false;
  try { process.kill(-child.pid, 0); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") return false; throw error; }
}

async function retire(backend: Backend): Promise<void> {
  for (const signal of ["SIGTERM", "SIGKILL"] as const) {
    if (!groupExists(backend.child)) break;
    try { process.kill(-backend.child.pid!, signal); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
    for (let tries = 0; tries < 100 && groupExists(backend.child); tries += 1) await wait(50);
  }
  assert.ok(!groupExists(backend.child), `Owned preview process group survived: ${String(backend.child.pid)}; retain outputs`);
  diagnostic({ kind: "stripe-preview-owner-collected", generation: backend.generation, pid: backend.child.pid, port: backend.port });
}

async function listen(server: Server, port: number): Promise<number> {
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => { server.off("error", reject); resolveListen(); });
  });
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");
  return address.port;
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  assert.equal(server.listening, false, "Owned loopback proxy did not close");
}

async function main(): Promise<void> {
  assert.equal(Reflect.has(globalThis, "Bun"), false, "Preview requires genuine Node 24");
  assert.equal(process.versions.node.split(".")[0], "24");
  assert.ok(process.platform === "darwin" || process.platform === "linux");
  const port = Number(process.argv[2] ?? "3000");
  assert.ok(process.argv.length <= 3 && Number.isInteger(port) && port >= 1024 && port <= 65535, "Usage: bun run dev [loopback-port]");
  const root = await realpath(process.cwd());
  assert.equal(root, process.cwd(), "Use the canonical checkout path");
  assert.equal(JSON.parse(await readFile(join(root, "package.json"), "utf8")).name, "@hraness/stripe-history");
  const state = join(root, ".stylex-preview");
  await mkdir(state, { recursive: true, mode: 0o700 });
  assert.equal(await realpath(state), state);
  const session = await mkdtemp(join(state, "session-"));
  const fixedInputs = ["package.json", "bun.lock", "stylex-config.ts", "scripts/compiled-preview.ts", "scripts/compiled-preview-state.ts", "scripts/compiled-preview-snapshot.ts"];
  const fixedHashes = await Promise.all(fixedInputs.map(async (file) => sha(await readFile(join(root, file)))));
  const selection = createPreviewSelection<Backend>();
  const owned = new Set<Backend>();
  const allOwned = new Set<Backend>();
  let stopping = false;
  let fatal = false;
  const commands = createPreviewCommands(process.stdin);
  const isStopping = () => stopping || commands.stopped();
  const stop = () => { stopping = true; commands.stop(); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const proxy = createServer((incoming, outgoing) => {
    const current = selection.current();
    if (current === undefined) { outgoing.writeHead(503); outgoing.end("Compiled preview is building.\n"); return; }
    const upstream = request({ hostname: "127.0.0.1", port: current.port, path: incoming.url, method: incoming.method, headers: incoming.headers, agent: false }, (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.setTimeout(30_000, () => upstream.destroy(new Error("Owned preview upstream timed out")));
    upstream.on("error", () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end("Owned preview server unavailable.\n"); });
    incoming.on("aborted", () => upstream.destroy());
    outgoing.on("close", () => { if (!outgoing.writableFinished) upstream.destroy(); });
    incoming.pipe(upstream);
  });
  proxy.on("upgrade", (_request, socket) => socket.destroy()); // No HMR/WebSocket path.
  try {
    await listen(proxy, port); // A port collision cannot signal an unrelated server.
    async function rebuild(): Promise<void> {
      try {
        assert.deepEqual(await Promise.all(fixedInputs.map(async (file) => sha(await readFile(join(root, file))))), fixedHashes, "Dependencies or runner changed; stop and restart the preview session");
        await selection.replace(async () => {
          const captured = await capturePreviewSnapshot(root, session);
          assert.deepEqual(await Promise.all(fixedInputs.map(async (file) => sha(await readFile(join(captured.root, file))))), fixedHashes, "Captured runner/dependencies differ from this preview session");
          diagnostic({ kind: "stripe-preview-attempt-captured", generation: captured.generation, root: captured.root });
          // Local-only identity is in this snapshot, never in authored public/.
          await writeFile(join(captured.root, "public", identityPath), JSON.stringify({ generation: captured.generation }), { flag: "wx" });
          if (isStopping()) throw new Error("Preview cancelled before build");
          const requiredSources = JSON.parse(await readFile(join(captured.root, "stylex-sources.json"), "utf8"));
          const record = await runStylexNextBuild({ ...stylexOptions(captured.root), attemptId: `preview-${captured.generation}`, requiredSources });
          assert.equal(record.state, "complete");
          assertPatchedNextDelivery(captured.root);
          await writeFile(join(captured.root, "preview-complete.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
          if (isStopping()) throw new Error("Preview cancelled after complete build");
          const reservation = createServer();
          const candidatePort = await listen(reservation, 0);
          await close(reservation);
          const child = spawn(process.execPath, [join(captured.root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(candidatePort)], {
            cwd: captured.root, env: { ...process.env, NODE_ENV: "production" }, detached: true, stdio: ["ignore", "inherit", "inherit"], shell: false,
          });
          const backend = { child, port: candidatePort, generation: captured.generation, root: captured.root };
          owned.add(backend);
          allOwned.add(backend);
          child.once("spawn", () => diagnostic({ kind: "stripe-preview-owner-started", generation: backend.generation, pid: child.pid, port: backend.port }));
          let spawnError: Error | undefined;
          child.on("error", (error) => { spawnError = error; });
          try {
            let ready = false;
            for (let attempt = 0; attempt < 200 && !isStopping(); attempt += 1) {
              if (spawnError !== undefined) throw spawnError;
              assert.ok(child.exitCode === null && child.signalCode === null, "Candidate preview server exited before readiness");
              try {
                const response = await fetch(`http://127.0.0.1:${candidatePort}/stripe/${identityPath}`, { signal: AbortSignal.timeout(500), redirect: "error" });
                if (response.ok && (await response.json() as { generation?: unknown }).generation === captured.generation) { ready = true; break; }
              } catch { /* Only exact identity, never an arbitrary 200, proves readiness. */ }
              await wait(100);
            }
            assert.ok(ready && !isStopping(), "Candidate preview server did not prove its generation identity");
            diagnostic({ kind: "stripe-preview-candidate-complete", generation: backend.generation, root: backend.root, pid: child.pid, record });
            return backend;
          } catch (error) { await collectPreviewOwner(backend, retire); owned.delete(backend); throw error; }
        }, async (previous) => {
          try { await collectPreviewOwner(previous, retire); owned.delete(previous); }
          catch (error) { fatal = true; throw error; }
        });
        diagnostic({ kind: "stripe-preview-ready", generation: selection.current()!.generation, url: `http://127.0.0.1:${port}/stripe`, refresh: "manual; no HMR or state-continuity claim" });
      } catch (error) {
        diagnostic({ kind: "stripe-preview-build-failed", message: String(error), retained: selection.current()?.root ?? null, session });
        // This adapter error means descendants may still own inputs/outputs.
        if (hasUnprovedPreviewCustody(error)) fatal = true;
        if (fatal) throw error;
      }
    }
    await rebuild();
    if (!isStopping()) console.log("Edit a recipe, enter rebuild, then manually refresh the browser. Enter quit to collect owned servers.");
    while (!isStopping()) {
      const next = await commands.iterator.next();
      if (next.done || isStopping() || next.value.trim() === "quit") break;
      const line = next.value;
      if (line.trim() === "rebuild") await rebuild();
      else console.log("Commands: rebuild | quit. This preview does not provide HMR.");
    }
  } finally {
    stopping = true;
    commands.stop();
    const errors: unknown[] = [];
    for (const backend of owned) {
      try { await retire(backend); owned.delete(backend); } catch (error) { errors.push(error); }
    }
    if (proxy.listening) { try { await close(proxy); } catch (error) { errors.push(error); } }
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    const groups = [...allOwned].map((backend) => {
      try { return { pid: backend.child.pid ?? null, port: backend.port, generation: backend.generation, absent: !groupExists(backend.child) }; }
      catch (error) { errors.push(error); return { pid: backend.child.pid ?? null, port: backend.port, generation: backend.generation, absent: null }; }
    });
    if (groups.some((group) => group.absent !== true) || proxy.listening) errors.push(new Error("Owned process/listener census is not absent"));
    diagnostic({ kind: "stripe-preview-custody", state: errors.length === 0 ? "complete" : "failed", groups, ownedServers: owned.size, proxyListening: proxy.listening });
    if (errors.length > 0) throw new AggregateError(errors, "Preview cleanup is unproved; preserve all outputs");
    diagnostic({ kind: "stripe-preview-collected", retained: session, ownedServers: owned.size, proxyListening: proxy.listening });
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
