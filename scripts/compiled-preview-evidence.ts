import { createHash } from "node:crypto";
import { createConnection } from "node:net";

export type Presence = "absent" | "present" | "unknown";

/** Raw native diagnostics can contain paths or environment values. The terminal
 * receipt records a bounded category/stage and digest, not diagnostic payload. */
export function previewErrorEvidence(stage: string, error: unknown) {
  const name = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/u.test(error.name) ? error.name : "Error";
  return { stage: stage.slice(0, 80), name, diagnosticSha256: createHash("sha256").update(String(error)).digest("hex") };
}

export function processPresence(pid: number): Presence {
  try { process.kill(pid, 0); return "present"; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH" ? "absent" : "unknown"; }
}

export async function loopbackListenerPresence(port: number): Promise<Presence> {
  return await new Promise<Presence>((done) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (state: Presence) => { socket.removeAllListeners(); socket.destroy(); done(state); };
    socket.once("connect", () => finish("present"));
    socket.once("error", (error: NodeJS.ErrnoException) => finish(error.code === "ECONNREFUSED" ? "absent" : "unknown"));
    socket.setTimeout(1_000, () => finish("unknown"));
  });
}

export function terminalPreviewState(workPassed: boolean, custodyPassed: boolean): "complete" | "failed" {
  return workPassed && custodyPassed ? "complete" : "failed";
}
