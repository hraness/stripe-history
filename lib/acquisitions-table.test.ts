import { describe, expect, test } from "bun:test";

import {
  categoryYearRange,
  deriveAcquisitionsSummary,
  FIRST_ACQUISITION_EVENT_ID,
  UNDISCLOSED_PRICE,
} from "./acquisitions-table";
import { loadHistory } from "./content";

describe("acquisitions table", () => {
  test("keeps every acquisition event, newest first, with its status verbatim", async () => {
    const history = await loadHistory();
    const acquisitions = history.events.filter(({ categoryId }) => categoryId === "acquisitions");
    const summary = deriveAcquisitionsSummary(history.events);

    expect(summary.rows).toHaveLength(acquisitions.length);
    expect(summary.rows.map(({ eventId }) => eventId).sort()).toEqual(
      acquisitions.map(({ id }) => id).sort(),
    );
    for (const row of summary.rows) {
      const event = acquisitions.find(({ id }) => id === row.eventId);
      expect(row.status).toBe(event?.status ?? "missing status");
      expect(row.deal).toBe(event?.title ?? "missing title");
      expect(row.price).toBe(event?.amount?.display ?? UNDISCLOSED_PRICE);
    }
    for (let index = 1; index < summary.rows.length; index += 1) {
      expect(summary.rows[index - 1]!.date >= summary.rows[index]!.date).toBe(true);
    }
    expect(summary.rows.at(-1)?.eventId).toBe(FIRST_ACQUISITION_EVENT_ID);
  });

  test("never presents open agreements or rejected offers as completed", async () => {
    const summary = deriveAcquisitionsSummary((await loadHistory()).events);
    const statuses = summary.rows.map(({ status }) => status);
    expect(statuses).toContain("Agreement announced; completion not reported");
    expect(statuses).toContain("Reported offer rejected; no agreement");
    for (const row of summary.rows) {
      if (/not reported|no agreement|not accepted|talks|interest/u.test(row.status)) {
        expect(row.status).not.toMatch(/^Completed/u);
      }
    }
  });

  test("derives the lead and year range from records", async () => {
    const history = await loadHistory();
    const summary = deriveAcquisitionsSummary(history.events);
    expect(summary.lead).toBe(
      `Stripe’s first acquisition was the Kickoff team in March 2013. This page lists ${summary.rows.length} acquisition events, from completed deals and team hires to announced agreements and reported talks, each with its status.`,
    );
    expect(categoryYearRange(history.events, "acquisitions")).toBe("2013–2026");
  });

  test("fails when the first acquisition record changes", async () => {
    const events = (await loadHistory()).events.filter(
      ({ id }) => id !== FIRST_ACQUISITION_EVENT_ID,
    );
    expect(() => deriveAcquisitionsSummary(events)).toThrow(/revise the acquisitions lead/u);
  });
});
