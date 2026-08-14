import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HistoryCategoryPage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("stripehistory.com category history", () => {
  test("generates every canonical category route", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(11);
    expect(params).toContainEqual({ category: "acquisitions" });
    expect(params).not.toContainEqual({ category: "payment-volume" });
  });

  test("publishes category-specific metadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: "acquisitions" }),
    });
    expect(metadata).toMatchObject({
      alternates: { canonical: "/history/acquisitions" },
      description: "Completed acquisitions, talent acquisitions, announced agreements, and credibly reported deal discussions involving Stripe.",
      title: "Stripe Acquisitions Timeline: 31 Sourced Events",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Stripe Acquisitions Timeline: 31 Sourced Events | stripehistory.com",
      url: "/history/acquisitions",
    });
  });

  test("renders a crawlable category-only timeline", async () => {
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "acquisitions" }),
    }));
    const eventCount = html.match(/class="history-event"/gu)?.length ?? 0;
    const categorizedEventCount = html.match(/data-category="acquisitions"/gu)?.length ?? 0;

    expect(eventCount).toBe(31);
    expect(categorizedEventCount).toBe(eventCount);
    expect(html).toContain('<h1 class="stripe-history-visually-hidden" id="history-heading">Stripe acquisitions history</h1>');
    expect(html).toContain('aria-current="true" aria-label="acquisitions: 31 events, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="acquisitions"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="acquisitions"'),
    );
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).toContain('id="stripe-history-history-category-structured-data"');
    expect(html).not.toContain('class="stripe-history-selector"');
    expect(html).toContain('class="stripe-history-header"');
    expect(html).toContain('href="/about">about</a>');
    expect(html).toContain('class="hraness-brand stripe-history-footer-hraness"');
    expect(html).not.toContain('class="stripe-history-breadcrumbs"');
    expect(html).not.toContain('class="stripe-history-section-heading"');
    expect(html).not.toMatch(/31 of \d+ events/u);
    expect(html).not.toContain("A month in Buenos Aires");
  });
});
