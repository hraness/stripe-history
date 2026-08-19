import { describe, expect, test } from "bun:test";
import { loadHistory } from "@/lib/content";
import { renderToStaticMarkup } from "react-dom/server";

import Home, { generateMetadata } from "./page";

describe("canonical stripehistory.com history", () => {
  test("publishes root-canonical history metadata", async () => {
    const history = await loadHistory();
    const metadata = await generateMetadata();
    const expectedTitle = `Stripe Company History: ${history.events.length} Sourced Events`;

    expect(metadata).toMatchObject({
      alternates: { canonical: "/" },
      title: expectedTitle,
    });
    expect(metadata.openGraph).toMatchObject({
      title: `${expectedTitle} | stripehistory.com`,
      url: "/",
    });
  });

  test("renders the sourced timeline, measures, controls, and public attribution", async () => {
    const history = await loadHistory();
    const html = renderToStaticMarkup(await Home());
    const eventCount = html.match(/class="history-event"/gu)?.length ?? 0;
    const categoryIconCount = html.match(
      /class="stripe-history-icon history-category-icon"/gu,
    )?.length ?? 0;

    expect(eventCount).toBe(history.events.length);
    expect(eventCount).toBeGreaterThanOrEqual(200);
    expect(html).toContain('class="plain-page stripe-history-main stripe-history-history-main"');
    expect(html).toContain('<a class="stripe-history-wordmark" href="/">stripehistory.com</a>');
    expect(html).toContain('<h1 class="stripe-history-visually-hidden" id="history-heading">Stripe company history</h1>');
    expect(html).not.toContain(
      "An independent, sourced timeline of Stripe products, people, funding, valuation, expansion, and milestones.",
    );
    expect(html).toContain(`aria-current="true" aria-label="all: ${history.events.length} events"`);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/history/appearances"');
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('id="history-year-2026"');
    expect(html).toContain('id="history-year-2005"');
    expect(html).toContain('class="history-event-type"');
    expect(categoryIconCount).toBeGreaterThan(eventCount);
    expect(html).toContain('data-filter-id="payment-and-payout-expansion"');
    expect(html).toContain(`aria-label="valuation: ${history.valuations.length} observations"`);
    expect(html).toMatch(
      /class="history-event" data-category="payment-and-payout-expansion" style="--history-category-hue:[0-9.]+"/u,
    );
    expect(html).toContain('data-measure="payment-volume"');
    expect(html).toContain('data-measure="valuation"');
    expect(html).toContain('class="history-event-confidence">reported</span>');
    expect(html).toContain('id="milestone-2026-2025-volume-1-9-trillion"');
    expect(html.match(/class="history-volume-track"/gu)?.length).toBe(
      history.annualVolumes.length + history.valuationHeadlines.length,
    );
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).toContain("Tokens Are the New Dollars");
    expect(html).toContain('data-category="appearances"');
    expect(html).toContain("A month in Buenos Aires produces Stripe&#x27;s first working prototype");
    expect(html).toContain('class="history-event-sources"');
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-history-history-structured-data"');
    expect(html).toContain('aria-label="Appearance: light"');
    expect(html).toContain('class="stripe-history-theme-icon"');
    expect(html).toContain('class="hraness-brand stripe-history-footer-hraness" href="https://hraness.com"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).not.toContain('class="stripe-history-selector"');
    expect(html).not.toContain('/atom.xml');
    expect(html).not.toContain('/news.yml');
    expect(html).not.toContain("<form");
    expect(html.indexOf('class="history-volume"')).toBeLessThan(
      html.indexOf('class="history-years"'),
    );
  });
});
