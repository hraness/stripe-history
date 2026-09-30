import assert from "node:assert/strict";
import type { runStylexNextBuild } from "@hraness/ui/stylex-build/next";

type Sources = Parameters<typeof runStylexNextBuild>[0]["requiredSources"];
const toolbar = ".vercel/adapter-toolbar-script.js";

/** Vercel's Next adapter creates this client input during modifyConfig, after
 * our attempt plan is committed. Declare it up front so the normal receipt,
 * source-map and discovery/delivery checks also govern the generated script.
 * Predicate: nextjs/adapter-vercel@cf3494517de2aad1cd9de3c72ff8da8a18c866e5,
 * packages/adapter/src/index.ts, modifyConfig (production build, Next 16.3). */
export function withVercelToolbarSource(sources: Sources, environment: Readonly<Record<string, string | undefined>>): Sources {
  if (!environment.NEXT_ADAPTER_PATH || environment.VERCEL_PREVIEW_COMMENTS_ENABLED !== "1") return sources;
  assert.ok(!sources.client.includes(toolbar), "Provider toolbar must not be declared as an authored source");
  return { ...sources, client: [toolbar, ...sources.client].sort() };
}
