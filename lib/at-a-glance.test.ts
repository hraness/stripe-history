import { describe, expect, test } from "bun:test";

import { deriveAtAGlance, HEADQUARTERS_EVENT_IDS } from "./at-a-glance";
import { loadHistory } from "./content";
import { plainText } from "./linked-text";
import { ORIGINS_LEAD_EVENT_IDS } from "./origins-lead";

describe("Stripe at a glance", () => {
  test("derives each row from a record and links it", async () => {
    const history = await loadHistory();
    const rows = deriveAtAGlance(history);
    const latestVolume = history.annualVolumes.at(-1);
    const latestRevenue = history.annualRevenues.at(-1);
    const latestValuation = history.valuationHeadlines.at(-1);

    expect(rows.map(({ label, value }) => [label, plainText(value)])).toEqual([
      ["Founders", "Patrick and John Collison"],
      ["First prototype", "January 2010, Buenos Aires"],
      ["Public launch", "September 30, 2011"],
      ["Headquarters", "South San Francisco and Dublin"],
      ["Annual volume", `${latestVolume?.display} total volume (${latestVolume?.calendarYear})`],
      ["Annual revenue", `${latestRevenue?.display} revenue (${latestRevenue?.calendarYear}, reported)`],
      ["Latest valuation", `${latestValuation?.display} (${latestValuation?.calendarYear}, company tender)`],
    ]);
    expect(rows.map(({ label }) => label)).not.toContain("IPO");
    for (const row of rows) {
      for (const part of row.value) {
        if (part.text.trim() !== "and") expect(part.target).toBeDefined();
      }
    }
    expect(rows.find(({ label }) => label === "Latest valuation")?.value[0]?.target).toEqual({
      kind: "page",
      path: `/history/valuation#${latestValuation?.observationId}`,
    });
  });

  test("fails when a cited record disappears", async () => {
    const history = await loadHistory();
    for (const id of [
      ORIGINS_LEAD_EVENT_IDS.prototype,
      ORIGINS_LEAD_EVENT_IDS.launch,
      HEADQUARTERS_EVENT_IDS.southSanFrancisco,
      HEADQUARTERS_EVENT_IDS.dublin,
    ]) {
      expect(() => deriveAtAGlance({
        ...history,
        events: history.events.filter((event) => event.id !== id),
      })).toThrow(id);
    }
    expect(() => deriveAtAGlance({ ...history, annualVolumes: [] })).toThrow("annual volume");
  });

  test("repeats a figure's qualifier unless it is a published value", async () => {
    const history = await loadHistory();
    const revenue = history.annualRevenues.at(-1);
    const volume = history.annualVolumes.at(-1);
    if (revenue === undefined || volume === undefined) throw new Error("fixture needs figures");
    const rows = deriveAtAGlance({
      ...history,
      annualRevenues: [{ ...revenue, qualifier: "published-value" }],
      annualVolumes: [{ ...volume, qualifier: "lower-bound" }],
    });
    const text = (label: string) => plainText(rows.find((row) => row.label === label)?.value ?? []);
    expect(text("Annual revenue")).toBe(`${revenue.display} revenue (${revenue.calendarYear})`);
    expect(text("Annual volume")).toBe(`${volume.display} total volume (${volume.calendarYear}, lower bound)`);
  });
});
