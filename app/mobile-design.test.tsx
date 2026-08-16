import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeToggle } from "@/support/theme";

import { HistoryMeasureRail } from "./history/history-measure-rail";

const [globalsCss, supportCss] = await Promise.all([
  Bun.file(new URL("./globals.css", import.meta.url)).text(),
  Bun.file(new URL("../support/styles.css", import.meta.url)).text(),
]);

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
