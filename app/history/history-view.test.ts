import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as stylex from "@stylexjs/stylex";
import { loadHistory } from "@/lib/content";

import { HistoryFilters, HistoryView, valuationBarPercent, valuationTierLabel } from "./history-view";
import { historyTimelineStyles as styles } from "./history-timeline.stylex";
import { historyFilterVisualStyle } from "./category-visuals";

test("every category and measure filter keeps selection, deselection, hue and compiled ink", async () => {
  const history = await loadHistory();
  const cases = [
    { id: "all", props: {} },
    ...history.categories.map(({ id }) => ({ id, props: { selectedCategoryId: id } })),
    { id: "payment-volume", props: { paymentVolumeSelected: true } },
    { id: "net-revenue", props: { netRevenueSelected: true } },
    { id: "valuation", props: { valuationSelected: true } },
  ];
  for (const { id, props } of cases) {
    const html = renderToStaticMarkup(createElement(HistoryFilters, { history, ...props }));
    expect(html.match(/aria-current="true"/gu)).toHaveLength(1);
    const selected = [...html.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/gu)]
      .find(([, attributes]) => attributes?.includes(`data-filter-id="${id}"`));
    expect(selected).toBeDefined();
    const attributes = selected![1]!;
    expect(attributes).toContain('aria-current="true"');
    expect(attributes).toContain('href="/"');
    expect(attributes).toContain('data-analytics-id="all"');
    expect(attributes).toContain(`class="history-filter-link ${stylex.props(styles.filterLink, styles.filterSelected).className}"`);
    expect(selected![2]).toContain(`class="history-filter-count ${stylex.props(styles.filterCount, styles.selectedInk).className}"`);
    expect(selected![2]).toContain(`class="stripe-history-icon history-category-icon ${stylex.props(styles.filterIcon, styles.selectedInk).className}"`);
    if (id === "all") expect(attributes).not.toContain("--history-category-hue");
    else expect(attributes).toContain("selected; activate to show all history");
  }
  const html = renderToStaticMarkup(createElement(HistoryFilters, { history }));
  for (const { id } of history.categories) {
    const attributes = [...html.matchAll(/<a\b([^>]+)>/gu)]
      .find(([, value]) => value?.includes(`data-filter-id="${id}"`))![1]!;
    expect(attributes).not.toContain('aria-current="true"');
    expect(attributes).toContain(`href="/history/${id}"`);
    expect(attributes).toContain(`style="--history-category-hue:${historyFilterVisualStyle(id)["--history-category-hue"]}"`);
    expect(attributes).toContain(`class="history-filter-link ${stylex.props(styles.filterLink).className}"`);
  }
});

test("real timeline years retain order, counts, anchors, first/sibling recipes and untouched event hooks", async () => {
  const history = await loadHistory();
  const html = renderToStaticMarkup(createElement(HistoryView, { history }));
  const counts = new Map<string, number>();
  for (const event of history.events) {
    const year = event.date.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const years = [...html.matchAll(/<section aria-labelledby="history-year-(\d+)" class="([^"]+)"/gu)];
  expect(years.map((match) => match[1])).toEqual([...counts.keys()]);
  for (const [index, match] of years.entries()) {
    expect(match[2]).toBe(`history-year ${stylex.props(styles.year, index === 0 ? styles.firstYear : styles.subsequentYear).className}`);
    expect(html).toContain(`href="#history-year-${match[1]}">${match[1]}</a>`);
    expect(html).toContain(`<span class="${stylex.props(styles.yearCount).className}">${counts.get(match[1]!)} events</span>`);
  }
  expect(html.match(/class="history-event" data-category=/gu)).toHaveLength(history.events.length);
  expect(html.match(/class="history-timeline [^"]+" role="list"/gu)).toHaveLength(counts.size);
  expect(html).toContain(`class="history-layout ${stylex.props(styles.layout).className}"`);
  expect(html).toContain(`class="history-years ${stylex.props(styles.years).className}"`);
});

describe("valuation chart scale", () => {
  test("uses a zero-based linear scale", () => {
    const earlyRound = valuationBarPercent(20_000_000, 159_000_000_000);
    const growthRound = valuationBarPercent(20_000_000_000, 159_000_000_000);

    expect(earlyRound).toBeCloseTo((20_000_000 / 159_000_000_000) * 100, 8);
    expect(growthRound).toBeCloseTo((20_000_000_000 / 159_000_000_000) * 100, 8);
    expect(growthRound / earlyRound).toBeCloseTo(1_000, 8);
    expect(valuationBarPercent(159_000_000_000, 159_000_000_000)).toBe(100);
  });

  test("handles boundaries without inventing a visible floor", () => {
    expect(valuationBarPercent(10_000_000, 10_000_000)).toBe(100);
    expect(valuationBarPercent(0, 10_000_000)).toBe(0);
    expect(valuationBarPercent(-1, 10_000_000)).toBe(0);
    expect(valuationBarPercent(20_000_000, 10_000_000)).toBe(100);
    expect(valuationBarPercent(0, 0)).toBe(0);
    expect(valuationBarPercent(Number.NaN, 10_000_000)).toBe(0);
  });

  test("labels financing and tender observations without implying company pricing", () => {
    expect(valuationTierLabel["financing-tender"]).toBe("financing / tender");
    expect(Object.values(valuationTierLabel)).not.toContain("company priced");
  });
});
