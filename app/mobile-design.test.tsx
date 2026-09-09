import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";
import * as stylex from "@stylexjs/stylex";
import { fileURLToPath } from "node:url";

import { ThemeMenuButton } from "@/support/theme";

import { HistoryMeasureRail } from "./history/history-measure-rail";
import { historyTimelineStyles } from "./history/history-timeline.stylex";

const [globalsCss, plainSiteCss, supportCss, layoutSource] = await Promise.all([
  Bun.file(new URL("./globals.css", import.meta.url)).text(),
  Bun.file(new URL("../support/plain-site.css", import.meta.url)).text(),
  Bun.file(new URL("../support/styles.css", import.meta.url)).text(),
  Bun.file(new URL("./layout.tsx", import.meta.url)).text(),
]);

const recipePath = fileURLToPath(new URL("./history/history-timeline.stylex.ts", import.meta.url));
const collector = createStylexTransformCollector(process.cwd());
const { rules } = await collector.transform(await Bun.file(recipePath).text(), recipePath);
type TimelineRecipe = (typeof historyTimelineStyles)[keyof typeof historyTimelineStyles];
function compiledRules(...styles: readonly TimelineRecipe[]): string {
  const className = stylex.props(styles).className;
  if (className === undefined || className.length === 0) throw new Error("Expected compiled recipe classes");
  const classes = new Set(className.split(" "));
  return rules.filter(([name]) => classes.has(name)).map(([, rule]) => rule.ltr).join("\n");
}

test("blue plain-site links stay quiet until interaction", () => {
  expect(plainSiteCss).toMatch(
    /:where\(:is\(\.plain-page, \.stripe-history-page\) a:not\(\.history-filter-link, \.history-year-link, \.history-event-type, \.hraness-marketing-action\), \.plain-footer a\)\s*\{[^}]*color:\s*var\(--plain-link\);[^}]*text-decoration:\s*none;/su,
  );
  expect(plainSiteCss).toMatch(
    /:is\(\.plain-page, \.stripe-history-page\) a:not\(\.history-filter-link, \.history-year-link, \.history-event-type, \.hraness-marketing-action\):is\(:hover, :focus-visible\)[\s\S]*?\{[^}]*text-decoration:\s*underline;/u,
  );
});

test("Ask AI links retain control styling inside plain pages", () => {
  expect(globalsCss).toMatch(
    /\.stripe-history-ask-ai \[data-slot="ask-ai-about-this-link"\]\s*\{[^}]*color:\s*var\(--ui-muted-foreground\);[^}]*text-decoration:\s*none;/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-ask-ai \[data-slot="ask-ai-about-this-link"\]:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ui-ring\);[^}]*outline-offset:\s*2px;[^}]*text-decoration:\s*none;/u,
  );
});

test("mobile history uses a controlled full-width chart rail instead of clipped panels", () => {
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-volume\s*\{[^}]*overflow:\s*visible;[^}]*position:\s*static;/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-measure-controls\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-measure-rail\s*\{[^}]*grid-auto-columns:\s*100%;[^}]*grid-auto-flow:\s*column;[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;[^}]*scroll-snap-type:\s*inline mandatory;/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-measure-rail figure\s*\{[^}]*max-block-size:\s*min\(16rem, 52svh\);[^}]*overflow-y:\s*auto;[^}]*scroll-snap-align:\s*start;/u,
  );

  const html = renderToStaticMarkup(
    <HistoryMeasureRail>
      <figure data-measure="payment-volume" id="history-measure-payment-volume" />
      <figure data-measure="net-revenue" id="history-measure-net-revenue" />
      <figure data-measure="valuation" id="history-measure-valuation" />
    </HistoryMeasureRail>,
  );
  expect(html).toContain('aria-label="Stripe scale over time"');
  expect(html).toContain('aria-controls="history-measure-payment-volume"');
  expect(html).toContain('aria-controls="history-measure-net-revenue"');
  expect(html).toContain('aria-controls="history-measure-valuation"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('class="history-measure-rail"');
});

test("mobile filter overflow has a scroll affordance without a persistent scrollbar", () => {
  const nav = compiledRules(historyTimelineStyles.filters);
  const list = compiledRules(historyTimelineStyles.filterList);
  expect(nav).toMatch(/@media\s*\(max-width:\s*54rem\).*::after\{background-image:linear-gradient/u);
  for (const declaration of ["overflow-x:auto", "scroll-snap-type:inline proximity", "scrollbar-width:none", "overscroll-behavior-inline:contain", "scroll-padding-inline-start:.25rem", "scroll-padding-inline-end:2rem"]) {
    expect(list).toContain(declaration);
  }
  expect(list).toMatch(/@media\s*\(max-width:\s*54rem\).*::-webkit-scrollbar\{display:none/u);
  expect(nav).toContain("pointer-events:none");
  expect(nav).toContain("inset-inline-end:0");
  expect(nav).toContain("position:absolute");
  expect(compiledRules(historyTimelineStyles.filterItem)).toContain("scroll-snap-align:start");
  expect(globalsCss).not.toContain(".history-filters::after");
});

test("compiled selected chips retain accent on hover and forced-color focus contrast", () => {
  const selected = compiledRules(historyTimelineStyles.filterLink, historyTimelineStyles.filterSelected);
  const unselected = compiledRules(historyTimelineStyles.filterLink);
  expect(selected).toMatch(/:hover\{background-color:var\(--hraness-site-accent\)/u);
  expect(selected).not.toContain("background-color:var(--plain-surface)");
  expect(selected).not.toContain("border-color:var(--plain-line-strong)");
  expect(selected).toMatch(/@media\s*\(forced-colors:\s*active\).*:hover\{background-color:Highlight/u);
  expect(selected).toMatch(/@media\s*\(forced-colors:\s*active\).*:focus-visible\{outline-color:HighlightText/u);
  expect(selected).toContain("outline-offset:-4px");
  expect(selected).toContain("box-shadow:none");
  expect(unselected).toContain("background-color:var(--plain-surface)");
  expect(unselected).toContain("outline-color:Highlight");
  expect(unselected).toContain("--history-category-ink:var(--plain-foreground)");
  expect(compiledRules(historyTimelineStyles.filterIcon)).toContain("color:var(--history-category-ink)");
  expect(compiledRules(historyTimelineStyles.filterIcon, historyTimelineStyles.selectedInk)).toContain("color:inherit");
  expect(compiledRules(historyTimelineStyles.filterCount, historyTimelineStyles.selectedInk)).not.toContain("color:var(--plain-muted)");
  expect(compiledRules(historyTimelineStyles.filterCount)).toContain("font-variant-numeric:tabular-nums");
  // Keep theme role evaluation on each element with its own closed hue input.
  expect(globalsCss).toContain('.history-filters a:not([data-filter-id="all"])');
  expect(globalsCss).toContain('--history-category-ink: oklch(0.43 0.14 var(--history-category-hue))');
  expect(globalsCss).toContain('--history-category-ink: oklch(0.8 0.11 var(--history-category-hue))');
});

test("compiled timeline retains sticky offsets, desktop ordering, responsive years and coarse links", () => {
  expect(compiledRules(historyTimelineStyles.section)).toContain("scroll-margin-top:calc(var(--history-header-offset) + .75rem)");
  const nav = compiledRules(historyTimelineStyles.filters);
  expect(nav).toContain("position:sticky");
  expect(nav).toContain("top:var(--history-header-offset)");
  expect(nav).toContain("z-index:40");
  for (const [side, recipe, color] of [
    ["bottom", historyTimelineStyles.filters, "var(--plain-line)"],
    ["top", historyTimelineStyles.yearHeading, "var(--plain-line-strong)"],
  ] as const) {
    const borders = compiledRules(recipe);
    expect(borders).toContain(`border-${side}-width:1px`);
    expect(borders).toContain(`border-${side}-style:solid`);
    expect(borders).toContain(`border-${side}-color:${color}`);
  }
  expect(compiledRules(historyTimelineStyles.filterLink)).toContain("min-height:max(2.125rem,var(--plain-link-target-min))");
  expect(nav).toContain("backdrop-filter:blur(12px)");
  expect(nav).toMatch(/@media\s*\(forced-colors:\s*active\).*backdrop-filter:none/u);
  const layout = compiledRules(historyTimelineStyles.layout);
  expect(layout).toContain("grid-template-columns:minmax(0,1fr) minmax(18rem,20rem)");
  expect(layout).toMatch(/@media\s*\(max-width:\s*54rem\).*display:block/u);
  expect(compiledRules(historyTimelineStyles.years)).toContain("grid-row:1");
  // The released compiler resolves block-start to top for this horizontal layout.
  expect(compiledRules(historyTimelineStyles.firstYear)).toContain("margin-top:0");
  const later = compiledRules(historyTimelineStyles.subsequentYear);
  expect(later).toContain("margin-top:2.75rem");
  expect(later).toMatch(/@media\s*\(max-width:\s*34rem\).*margin-top:2rem/u);
  expect(compiledRules(historyTimelineStyles.year)).toContain("scroll-margin-top:calc(var(--history-filter-stack-offset) + 1rem)");
  const title = compiledRules(historyTimelineStyles.yearTitle);
  expect(title).toContain("font-size:1.25rem");
  expect(title).toContain("font-weight:500");
  expect(title).toContain("line-height:inherit");
  for (const style of [historyTimelineStyles.yearLink, historyTimelineStyles.filterLink]) {
    expect(compiledRules(style)).toMatch(/@media\s*\(pointer:\s*coarse\).*min-height:var\(--plain-link-target-min,48px\)/u);
  }
  expect(compiledRules(historyTimelineStyles.yearLink)).toMatch(/@media\s*\(pointer:\s*coarse\).*display:inline-flex/u);
  expect(compiledRules(historyTimelineStyles.yearLink)).toContain("outline:1px dotted currentColor");
  const description = compiledRules(historyTimelineStyles.description);
  expect(description).toMatch(/margin(?:-block|-inline)?[^:]*:0/u);
  expect(description).toMatch(/@media\s*\(max-width:\s*34rem\).*font-size:.875rem/u);
  expect(compiledRules(historyTimelineStyles.timeline)).toContain("list-style:none");
});

test("unlayered plain-site rules exclude only the new compiled presentation roles", () => {
  expect(plainSiteCss).toContain(':is(.plain-page, .stripe-history-page) section:where(:not(.history-year, .hraness-marketing-stats, .hraness-marketing-questions, .hraness-marketing-maker))');
  expect(plainSiteCss).toContain(':is(.plain-page, .stripe-history-page) h2:where(:not(.history-year-title, .hraness-marketing-questions__heading, .hraness-marketing-maker__heading))');
  expect(plainSiteCss).toContain(':where(:not(.history-year-title, .history-filter-description, .history-event-title, .history-event-kicker, .history-event-sources, .hraness-marketing-hero__heading');
  expect(plainSiteCss).toContain(':where(:not(.history-event-title, .hraness-marketing-hero__heading, .hraness-marketing-questions__heading, .hraness-marketing-maker__heading))');
  expect(plainSiteCss).toContain('.plain-site :where(:is(.plain-page, .stripe-history-page) a:not(.history-filter-link, .history-year-link, .history-event-type, .hraness-marketing-action):focus-visible, .plain-footer a:focus-visible)');
  expect(globalsCss).toContain('.stripe-history-section h2:where(:not(.history-year-title))');
  expect(globalsCss).not.toContain('.history-year-heading h2');
  expect(globalsCss).not.toContain('.history-filters a:hover');
  expect(globalsCss).not.toContain('.history-year + .history-year');
});

test("all compiled timeline/filter producers avoid the shared unlayered page opt-in", async () => {
  for (const path of ["history-view.tsx", "payment-volume/page.tsx", "net-revenue/page.tsx", "valuation/page.tsx"]) {
    const source = await Bun.file(new URL(`./history/${path}`, import.meta.url)).text();
    expect(source).toContain('className="stripe-history-page stripe-history-main stripe-history-history-main"');
    expect(source).not.toMatch(/className="[^"]*\bplain-page\b/u);
  }
  // The real immutable foundation still contains the old rule. Local exclusions
  // alone cannot cancel it while the shared opt-in class remains on an ancestor.
  const shared = await Bun.file(new URL("../node_modules/@hraness/design-kit/src/plain-site.css", import.meta.url)).text();
  expect(shared).toMatch(/\.plain-page section\s*\{\s*margin-top:\s*2rem;/u);
  expect(shared).not.toContain(".stripe-history-page");
  expect(plainSiteCss).toMatch(/\.stripe-history-page > p\s*\{\s*color: var\(--plain-muted\);\s*margin: 0;/u);
  expect(plainSiteCss).toMatch(/\.plain-site :where\(\.stripe-history-page a:focus:not\(:focus-visible\)\)\s*\{\s*outline: none;/u);
});

test("evidence orientation reflows without hiding actions or shrinking touch targets", () => {
  expect(globalsCss).toMatch(
    /\.stripe-history-evidence dl\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.stripe-history-evidence dl\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 34rem\)[\s\S]*?\.stripe-history-evidence-actions ul\s*\{[^}]*flex-direction:\s*column;/u,
  );
  expect(globalsCss).toMatch(
    /@media \(pointer: coarse\)\s*\{[\s\S]*?\.stripe-history-evidence-actions a,[\s\S]*?min-block-size:\s*var\(--plain-link-target-min, 48px\);/u,
  );
});

test("theme control uses the unmodified shared System-first icon menu", () => {
  const html = renderToStaticMarkup(<ThemeMenuButton />);

  expect(html).toContain('data-theme-value="system"');
  expect(html).toContain('data-presentation="menu"');
  expect(html).toContain('aria-label="Appearance: System"');
  expect(html).toContain("<svg");
  expect(html).not.toMatch(/[☀☾]/u);
  expect(html).not.toContain("stripe-history-theme-toggle");
  expect(supportCss).not.toContain("stripe-history-theme-toggle");
});

test("site chrome matches the compact sticky Hraness shell and preserves coarse hit targets", () => {
  expect(layoutSource).toContain('import "@hraness/site-footer/compiler-foundation.css";');
  expect(globalsCss).not.toContain('@import "@hraness/site-footer/styles.css";');
  expect(globalsCss).toMatch(
    /\.stripe-history-main\s*\{[^}]*margin-block:\s*0;/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-header\s*\{[^}]*inline-size:\s*100vw;[^}]*position:\s*sticky;[^}]*top:\s*0;/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-header \.hraness-marketing-header__inner\s*\{[^}]*max-width:\s*64rem;[^}]*min-block-size:\s*3\.5rem;/u,
  );
  expect(plainSiteCss).toMatch(
    /@media \(pointer: coarse\)\s*\{[^}]*--plain-link-target-min:\s*var\(--interactive-target-min, 48px\);/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-main > \.hraness-site-footer\s*\{[^}]*--hraness-site-footer-measure:\s*64rem;[^}]*inline-size:\s*100vw;[^}]*margin-inline:\s*calc\(50% - 50vw\);/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-substack__embed\s*\{[^}]*height:\s*150px;[^}]*max-inline-size:\s*100%;[^}]*width:\s*480px;/u,
  );
});
