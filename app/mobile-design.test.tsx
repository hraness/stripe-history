import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeMenuButton } from "@/support/theme";

import { HistoryMeasureRail } from "./history/history-measure-rail";

const [globalsCss, plainSiteCss, supportCss] = await Promise.all([
  Bun.file(new URL("./globals.css", import.meta.url)).text(),
  Bun.file(new URL("../support/plain-site.css", import.meta.url)).text(),
  Bun.file(new URL("../support/styles.css", import.meta.url)).text(),
]);

test("blue plain-site links stay quiet until interaction", () => {
  expect(plainSiteCss).toMatch(
    /:where\(\.plain-page a, \.plain-footer a\)\s*\{[^}]*color:\s*var\(--plain-link\);[^}]*text-decoration:\s*none;/su,
  );
  expect(plainSiteCss).toMatch(
    /\.plain-page a:is\(:hover, :focus-visible\)[\s\S]*?\{[^}]*text-decoration:\s*underline;/u,
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
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-filters::after\s*\{[^}]*background:\s*linear-gradient/gu,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-filters ul\s*\{[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*inline proximity;[^}]*scrollbar-width:\s*none;/u,
  );
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
  expect(globalsCss).toContain('@import "@hraness/site-footer/styles.css";');
  expect(globalsCss).toMatch(
    /\.stripe-history-main\s*\{[^}]*margin-block:\s*0 clamp\(2\.5rem, 8vh, 5rem\)/u,
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
});
