import { describe, expect, test } from "bun:test";

import type { HistoryEvent } from "../lib/history-schema";
import {
  coalesceHistoryEvents,
  sessionSources,
  validateHistoryDuplicateOutput,
} from "./update-sessions-history";

function event(sourceUrl: string): HistoryEvent {
  return {
    confidence: "confirmed",
    date: "2026-04-29",
    date_precision: "day",
    id: "2026-04-29-example-product",
    sources: [{
      kind: "primary",
      publisher: "Stripe",
      title: "Sessions source",
      url: sourceUrl,
    }],
    status: "announced",
    summary: "Stripe announced a material product launch with enough concrete detail for the public history record.",
    title: "Stripe announces example product",
  };
}

describe("Stripe Sessions source set", () => {
  test("is chronological, HTTPS-only, and Stripe-owned", () => {
    expect(sessionSources.length).toBeGreaterThanOrEqual(7);
    expect(sessionSources.map(({ date }) => date)).toEqual(
      sessionSources.map(({ date }) => date).toSorted(),
    );
    for (const source of sessionSources) {
      const url = new URL(source.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("stripe.com");
    }
  });

  test("coalesces deterministic IDs while retaining every source", () => {
    const events = coalesceHistoryEvents([
      event("https://stripe.com/blog/source-one"),
      event("https://stripe.com/blog/source-two"),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.sources.map(({ url }) => url)).toEqual([
      "https://stripe.com/blog/source-one",
      "https://stripe.com/blog/source-two",
    ]);
  });

  test("requires semantic duplicates to reference retained records", () => {
    const proposedIds = new Set(["proposal-a", "proposal-b"]);
    expect(() => validateHistoryDuplicateOutput({
      duplicates: [
        {
          duplicate_id: "proposal-a",
          duplicate_of_id: "proposal-b",
          reason: "These proposals describe the same underlying launch event.",
        },
        {
          duplicate_id: "proposal-b",
          duplicate_of_id: "proposal-a",
          reason: "These proposals describe the same underlying launch event.",
        },
      ],
    }, proposedIds, new Set())).toThrow("must reference a retained record");
  });
});
