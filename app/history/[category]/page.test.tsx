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
    expect(html).toContain("Stripe acquisitions history");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('<a href="/">history</a>');
    expect(html).toContain("31 of 230 events");
    expect(html).toContain('aria-current="page" data-analytics-event="history filter selected" data-analytics-id="acquisitions"');
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).toContain('id="stripe-guide-history-category-structured-data"');
    expect(html).not.toContain('class="stripe-guide-selector"');
    expect(html).not.toContain("A month in Buenos Aires");
  });
});
