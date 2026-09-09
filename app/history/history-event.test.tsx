import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";
import * as stylex from "@stylexjs/stylex";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";
import { HistoryEventArticle } from "./history-event-article";
import { HistoryView } from "./history-view";
import { historyEventStyles as styles } from "./history-event.stylex";
import PaymentVolumePage from "./payment-volume/page";
import NetRevenuePage from "./net-revenue/page";
import ValuationPage from "./valuation/page";

const recipePath = fileURLToPath(new URL("./history-event.stylex.ts", import.meta.url));
const collector = createStylexTransformCollector(process.cwd());
const { rules } = await collector.transform(await Bun.file(recipePath).text(), recipePath);
type Recipe = (typeof styles)[keyof typeof styles];
function classes(...recipes: readonly Recipe[]): string {
  const result = stylex.props(recipes).className;
  if (result === undefined || result.length === 0) throw new Error("Missing compiled event classes");
  return result;
}
function css(...recipes: readonly Recipe[]): string {
  const selected = new Set(classes(...recipes).split(" "));
  return rules.filter(([name]) => selected.has(name)).map(([, rule]) => rule.ltr).join("\n");
}

test("event recipes preserve frame, typography, responsive facts and source targets", () => {
  expect(css(styles.frame)).toContain("border-inline-start-width:3px");
  expect(css(styles.frame)).toContain("border-inline-start-color:var(--history-category-ink)");
  expect(css(styles.frame)).toMatch(/@media\s*\(max-width:\s*34rem\).*padding-left:.7rem/u);
  expect(css(styles.frame)).not.toContain("border-bottom");
  for (const [side, recipe] of [["top", styles.frame], ["bottom", styles.lastFrame]] as const) {
    expect(css(recipe)).toContain(`border-${side}-width:1px`);
    expect(css(recipe)).toContain(`border-${side}-style:solid`);
    expect(css(recipe)).toContain(`border-${side}-color:var(--plain-line)`);
  }
  expect(css(styles.article)).toContain("scroll-margin-top:calc(var(--history-filter-stack-offset) + 1rem)");
  expect(css(styles.title)).toContain("font-size:1.05rem");
  expect(css(styles.title)).toContain("font-weight:600");
  expect(css(styles.title)).toMatch(/@media\s*\(max-width:\s*34rem\).*line-height:1.4/u);
  expect(css(styles.kicker)).toContain("font-size:var(--text-caption)");
  expect(css(styles.kicker)).toContain("flex-wrap:wrap");
  expect(css(styles.date)).toContain("font-family:var(--font-mono)");
  expect(css(styles.date)).toContain("font-size:.75rem");
  expect(css(styles.date)).toContain("white-space:nowrap");
  expect(css(styles.summary)).toMatch(/@media\s*\(max-width:\s*34rem\).*line-height:1.5/u);
  expect(css(styles.facts)).toContain("margin-top:.65rem");
  expect(css(styles.factRow)).toContain("grid-template-columns:minmax(5.5rem,.3fr) minmax(0,1fr)");
  expect(css(styles.factRow)).toMatch(/@media\s*\(max-width:\s*34rem\).*display:block/u);
  expect(css(styles.factTerm)).toContain("color:var(--plain-muted)");
  expect(css(styles.factValue)).toContain("font-variant-numeric:tabular-nums");
  expect(css(styles.sources)).toContain("text-align:end");
  expect(css(styles.sourceLink)).toContain("min-height:1.5rem");
  expect(css(styles.sourceLink)).toMatch(/@media\s*\(pointer:\s*coarse\).*display:inline-flex/u);
});

test("category and confidence chips retain native focus and forced/coarse behavior", () => {
  const type = css(styles.type);
  expect(type).toContain("background-color:var(--history-category-soft)");
  expect(type).toContain("text-decoration-line:none");
  expect(type).toContain("min-height:1.65rem");
  for (const recipe of [styles.type, styles.status]) {
    expect(css(recipe)).toContain("border-style:solid");
    expect(css(recipe)).toContain("border-width:1px");
    expect(css(recipe)).toContain("border-image-source:none");
  }
  expect(type).toContain(":focus-visible{border-radius:1px");
  expect(type).toContain("outline-style:dotted");
  expect(type).toContain("outline-width:1px");
  expect(type).toContain("outline-offset:3px");
  expect(type).toMatch(/@media\s*\(forced-colors:\s*active\).*background-color:Canvas/u);
  expect(type).toMatch(/@media\s*\(forced-colors:\s*active\).*color:CanvasText/u);
  expect(css(styles.frame)).toMatch(/@media\s*\(forced-colors:\s*active\).*border-inline-start-color:CanvasText/u);
  for (const recipe of [styles.type, styles.sourceLink]) {
    expect(css(recipe)).toMatch(/@media\s*\(pointer:\s*coarse\).*min-height:var\(--plain-link-target-min,48px\)/u);
  }
  expect(css(styles.typeIcon)).toContain("color:var(--history-category-ink)");
  expect(css(styles.status, styles.confidence)).toContain("color:var(--plain-foreground)");
  expect(css(styles.status, styles.confidence)).not.toContain("color:var(--plain-muted)");
  const disclosure = css(styles.type, styles.disclosureType);
  expect(disclosure).toContain("border-style:none");
  expect(disclosure).toContain("border-width:medium");
  expect(disclosure).toContain("border-color:currentColor");
  expect(disclosure).not.toContain("border-style:solid");
  expect(disclosure).not.toContain("border-width:1px");
});

test("every real timeline event retains its semantic payload and exact compiled roles", async () => {
  const history = await loadHistory();
  for (const event of history.events) {
    const html = renderToStaticMarkup(<HistoryEventArticle event={event} />);
    expect(html).toContain(`id="${event.id}" class="${classes(styles.article)}"`);
    expect(html).toContain(`class="history-event-kicker ${classes(styles.kicker)}"`);
    expect(html).toContain(`class="${classes(styles.date)}" dateTime="${event.date}"`);
    expect(html).toContain(`class="history-event-title ${classes(styles.title)}"`);
    expect(html).toContain(`class="history-event-type ${classes(styles.type)}"`);
    expect(html).toContain(`data-analytics-id="${event.categoryId}"`);
    expect(html).toContain(`href="/history/${event.categoryId}#${event.id}"`);
    expect(html.match(/data-analytics-event="source link opened"/gu)).toHaveLength(event.sources.length);
    expect(html.match(new RegExp(`class="${classes(styles.sourceLink)}"`, "gu"))).toHaveLength(event.sources.length);
    const factCount = Number(event.amount !== undefined) + (event.metrics?.length ?? 0) + (event.details?.length ?? 0);
    expect(html.match(new RegExp(`<dt class="${classes(styles.factTerm)}">`, "gu")) ?? []).toHaveLength(factCount);
    expect(html.match(new RegExp(`<dd class="${classes(styles.factValue)}">`, "gu")) ?? []).toHaveLength(factCount);
    expect(html.includes("history-event-confidence")).toBe(event.confidence !== "confirmed");
    expect(html.includes("history-event-status")).toBe(event.status !== undefined);
  }
});

test("each real year has exactly one final border and metrics never acquire timeline frames", async () => {
  const history = await loadHistory();
  const html = renderToStaticMarkup(<HistoryView history={history} />);
  const items = [...html.matchAll(/<li class="history-event ([^"]+)" data-category="([^"]+)" style="--history-category-hue:([0-9.]+)"><article id="([^"]+)"/gu)];
  expect(items).toHaveLength(history.events.length);
  for (const [index, event] of history.events.entries()) {
    const last = history.events[index + 1]?.date.slice(0, 4) !== event.date.slice(0, 4);
    expect(items[index]?.[1]).toBe(classes(styles.frame, ...(last ? [styles.lastFrame] : [])));
    expect(items[index]?.[2]).toBe(event.categoryId);
    expect(items[index]?.[4]).toBe(event.id);
  }
  for (const page of [PaymentVolumePage, NetRevenuePage, ValuationPage]) {
    const metric = renderToStaticMarkup(await page());
    expect(metric).not.toContain('class="history-event ');
    expect(metric).not.toContain('class="history-event-title ');
    for (const [role, recipe] of [["kicker", styles.kicker], ["facts", styles.facts], ["sources", styles.sources]] as const) {
      expect(metric).toContain(`class="history-event-${role} ${classes(recipe)}"`);
    }
    expect(metric).toContain(`<dt class="${classes(styles.factTerm)}">`);
    expect(metric).toContain(`<dd class="${classes(styles.factValue)}">`);
    expect(metric).toContain(`class="${classes(styles.sourceLink)}"`);
    expect(metric).toContain(`class="${classes(styles.date)}" dateTime=`);
    if (page === ValuationPage) expect(metric).not.toContain('class="history-event-type ');
    else expect(metric).toContain(`class="history-event-type ${classes(styles.type, styles.disclosureType)}"`);
  }
});

test("only owned event rules leave legacy CSS; theme and metric owners remain", async () => {
  const globals = await Bun.file(new URL("../globals.css", import.meta.url)).text();
  const plain = await Bun.file(new URL("../../support/plain-site.css", import.meta.url)).text();
  for (const selector of [".history-event h3", ".history-event:last-child", ".history-event article", ".history-event-facts div", ".history-event-type {", ".history-event-status", ".history-event-sources a"]) {
    expect(globals).not.toContain(selector);
  }
  expect(globals).toContain(".history-event,");
  expect(globals).toContain("--history-category-ink: oklch(0.43 0.14 var(--history-category-hue))");
  expect(globals).toContain("--history-category-ink: oklch(0.8 0.11 var(--history-category-hue))");
  expect(globals).toContain(".history-volume-disclosure-list > li");
  expect(globals).toContain(".history-valuation-observation-list h3");
  expect(plain).toContain("a:not(.history-filter-link, .history-year-link, .history-event-type)");
  expect(plain).toContain(":where(h1, h2, h3):where(:not(.history-event-title))");
  expect(plain).toContain(".history-event-title, .history-event-kicker, .history-event-sources");
});

test("the explicit production census includes the real server-owned event recipe", async () => {
  const census = await Bun.file(new URL("../../stylex-sources.json", import.meta.url)).json() as Record<string, unknown>;
  expect(Array.isArray(census.nodeRsc)).toBe(true);
  expect((census.nodeRsc as unknown[]).filter((path) => path === "app/history/history-event.stylex.ts")).toHaveLength(1);
  expect(census.client).not.toContain("app/history/history-event.stylex.ts");
  expect(census.edgeRsc).toEqual([]);
});
