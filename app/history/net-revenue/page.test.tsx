import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";

import NetRevenuePage, {
  generateMetadata,
} from "./page";
import {
  deriveNetRevenuePageMetadata,
  deriveNetRevenuePageSeo,
} from "./net-revenue-page-model";

describe("hraness.com/stripe net-revenue history", () => {
  test("publishes a canonical, descriptive search result from the dataset", async () => {
    const metadata = await generateMetadata();
    const seo = deriveNetRevenuePageSeo(await loadHistory());

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/history/net-revenue" },
      description: seo.description,
      title: seo.title,
    });
    expect(metadata.openGraph).toMatchObject({
      title: `${seo.title} | hraness.com/stripe`,
      url: "https://hraness.com/stripe/history/net-revenue",
    });
  });

  test("updates the range and latest claim when a later full-year figure is added", async () => {
    const history = await loadHistory();
    const priorSeo = deriveNetRevenuePageSeo(history);
    const currentLatest = history.netRevenues.find(
      ({ id }) => id === history.netRevenueHeadlines.at(-1)?.observationId,
    );
    if (currentLatest === undefined) throw new Error("Missing latest net-revenue fixture");

    const updatedHistory = {
      netRevenues: [{
        ...currentLatest,
        calendar_year: 2026,
        id: "net-revenue-2026-company-revenue-fixture",
        period_end: "2026",
        title: "Fixture reports Stripe 2026 revenue of $9 billion",
        amount: {
          ...currentLatest.amount,
          display: "$9 billion",
          value_usd: 9_000_000_000,
        },
      }, ...history.netRevenues],
    };
    const updatedSeo = deriveNetRevenuePageSeo(updatedHistory);
    const updatedMetadata = deriveNetRevenuePageMetadata(updatedHistory);

    expect(updatedSeo).toMatchObject({
      description: expect.stringContaining("$9 billion 2026 revenue"),
      lead: expect.stringMatching(
        /\$9 billion in 2026.*not affiliated with, endorsed by, or operated by/su,
      ),
      title: "Stripe Net Revenue Observations, 2025–2026",
      yearRange: "2025–2026",
    });
    expect(updatedMetadata).toMatchObject({
      description: expect.stringContaining("$9 billion 2026 revenue"),
      openGraph: {
        title: "Stripe Net Revenue Observations, 2025–2026 | hraness.com/stripe",
      },
      title: "Stripe Net Revenue Observations, 2025–2026",
    });
    expect(updatedSeo).not.toEqual(priorSeo);
  });

  test("renders sourced company figures, related cash, and methodology", async () => {
    const history = await loadHistory();
    const seo = deriveNetRevenuePageSeo(history);
    const latestHeadline = history.netRevenueHeadlines.at(-1);
    if (latestHeadline === undefined) throw new Error("Missing latest net-revenue headline");
    const html = renderToStaticMarkup(await NetRevenuePage());

    expect(html).toContain(`<h1 class="history-page-title" id="net-revenue-page-heading">${seo.title}</h1>`);
    expect(html).not.toContain('class="stripe-history-visually-hidden"');
    expect(html).toContain(seo.lead);
    expect(html).toContain(seo.description);
    expect(html).toContain("<table>");
    expect(html).toContain('<th scope="col">year</th>');
    expect(html).toContain('<th scope="col">amount</th>');
    expect(html).toContain('<th scope="col">metric</th>');
    expect(html).toContain('<th scope="col">status</th>');
    expect(html).toContain('<th scope="col">sources</th>');
    expect(html).toContain(`<tr id="${latestHeadline.observationId}"`);
    expect(html).toContain(`"numberOfItems":${history.netRevenueHeadlines.length}`);
    expect(html).toContain(`https://hraness.com/stripe/history/net-revenue#${latestHeadline.observationId}`);
    expect(html).toContain(`${latestHeadline.calendarYear}: ${latestHeadline.display}`);
    expect(html.match(/class="history-volume-chart-track"/gu)?.length).toBe(1);
    expect(html.match(/<tr(?:\s|>)/gu)?.length).toBe(2);
    expect(html).toContain("$6.8 billion");
    expect(html).toContain("$3.2 billion");
    expect(html).toContain("reported");
    expect(html).toContain("The Information reports Stripe 2025 revenue of $6.8 billion");
    expect(html).toContain("The Information reports Stripe minted $3.2 billion in cash in 2025");
    expect(html).toContain("after interchange, scheme, and bank-partner fees");
    expect(html).toContain("The Information wrote &quot;revenue,&quot;");
    expect(html).toContain("Irish statutory accounts");
    expect(html).toContain("Missing years are gaps");
    expect(html).toContain("H1 growth rates stay on the events");
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('data-value-usd="6800000000"');
    expect(html).toContain('href="#net-revenue-2025-company-revenue"');
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('data-analytics-kind="net-revenue"');
    expect(html).toContain('id="stripe-history-net-revenue-structured-data"');
    expect(html).toContain('aria-current="true" aria-label="net revenue: 2 observations, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="net-revenue"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="payment-volume"')).toBeLessThan(
      html.indexOf('data-filter-id="net-revenue"'),
    );
    expect(html).not.toContain("$5.12");
    expect(html).not.toContain("$5.1 billion");
    expect(html).not.toContain("the singularity");
  });
});
