import { loadHistory, type HistoryCollection } from "./content";

let pending: Promise<HistoryCollection> | undefined;

/**
 * The website reads the published YAML once per server process. A static
 * build renders one page per event, and reparsing the corpus for each would
 * cost about a minute. Scripts that write YAML keep calling `loadHistory`.
 */
export function loadSiteHistory(): Promise<HistoryCollection> {
  pending ??= loadHistory().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
