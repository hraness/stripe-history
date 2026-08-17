import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeToggle } from "@/support/theme";

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

test("mobile history uses a controlled full-width chart rail instead of clipped panels", () => {
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-volume\s*\{[^}]*overflow:\s*visible;[^}]*position:\s*static;/u,
  );
  expect(globalsCss).toMatch(
    /@media \(max-width: 54rem\)[\s\S]*?\.history-measure-controls\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/u,
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
      <figure data-measure="valuation" id="history-measure-valuation" />
    </HistoryMeasureRail>,
  );
  expect(html).toContain('aria-label="Stripe scale over time"');
  expect(html).toContain('aria-controls="history-measure-payment-volume"');
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

test("theme control uses HugeIcons with a compact visual ring and full hit target", () => {
  const html = renderToStaticMarkup(<ThemeToggle />);

  expect(html).toContain('class="stripe-history-theme-icon"');
  expect(html).toContain("<svg");
  expect(html).not.toMatch(/[☀☾]/u);
  expect(supportCss).toMatch(
    /\.stripe-history-theme-toggle\s*\{[^}]*min-block-size:\s*max\(2\.5rem, var\(--plain-link-target-min\)\);[^}]*min-inline-size:\s*max\(2\.5rem, var\(--plain-link-target-min\)\);/u,
  );
  expect(supportCss).toMatch(
    /\.stripe-history-theme-toggle::before\s*\{[^}]*block-size:\s*2rem;[^}]*border:\s*1px solid var\(--plain-line\);[^}]*inline-size:\s*2rem;/u,
  );
});

test("site chrome begins close to the viewport while preserving coarse hit targets", () => {
  expect(globalsCss).toMatch(
    /\.stripe-history-main\s*\{[^}]*margin-block:\s*max\(0\.25rem, env\(safe-area-inset-top\)\)/u,
  );
  expect(globalsCss).toMatch(
    /\.stripe-history-header\s*\{[^}]*min-block-size:\s*2\.5rem;[^}]*padding-block:\s*0;/u,
  );
  expect(plainSiteCss).toMatch(
    /@media \(pointer: coarse\)\s*\{[^}]*--plain-link-target-min:\s*var\(--interactive-target-min, 48px\);/u,
  );
});
