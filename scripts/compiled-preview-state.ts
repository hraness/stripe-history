import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

/** Subscribe before the first asynchronous build: readline's iterator is lazy. */
export function createPreviewCommands(input: Readable) {
  const lines = createInterface({ input });
  const iterator = lines[Symbol.asyncIterator]();
  let stopped = false;
  lines.once("close", () => { stopped = true; });
  return {
    iterator,
    stopped: () => stopped,
    stop() { stopped = true; lines.close(); },
  };
}

export class PreviewCustodyError extends AggregateError {
  constructor(errors: unknown[]) {
    super(errors, "Owned preview process absence is unproved; preserve outputs and stop rebuilding");
  }
}

export async function collectPreviewOwner<T>(owner: T, collect: (owner: T) => Promise<void>): Promise<void> {
  try { await collect(owner); }
  catch (error) { throw new PreviewCustodyError([error]); }
}

/** The released adapter can wrap process-custody errors in an aggregate/cause. */
export function hasUnprovedPreviewCustody(error: unknown, seen = new Set<unknown>()): boolean {
  if (!(error instanceof Error) || seen.has(error)) return false;
  seen.add(error);
  if (error instanceof PreviewCustodyError || error.constructor.name === "UncollectedNextProcessError") return true;
  return hasUnprovedPreviewCustody(error.cause, seen) ||
    (error instanceof AggregateError && error.errors.some((nested: unknown) => hasUnprovedPreviewCustody(nested, seen)));
}

/** This state machine does not confer a build receipt; its caller must finish
 * the native build and prove the candidate server's identity before publish. */
export function createPreviewSelection<T>() {
  let current: T | undefined;
  return {
    current: () => current,
    async replace(prepare: () => Promise<T>, retire: (previous: T) => Promise<void>) {
      const candidate = await prepare(); // A rejection cannot replace current.
      const previous = current;
      current = candidate;
      if (previous !== undefined) await retire(previous);
      return candidate;
    },
  };
}
