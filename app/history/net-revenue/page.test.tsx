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
    const currentLatest = history.annualRevenues.at(-1);
    const currentEvent = history.events.find(({ id }) => id === currentLatest?.eventId);
    if (currentLatest === undefined || currentEvent === undefined) {
      throw new Error("Missing latest annual revenue fixture");
    }

    const updatedHistory = {
      annualRevenues: [...history.annualRevenues, {
        calendarYear: 2026,
        categoryId: currentLatest.categoryId,
        display: "$9 billion",
        eventId: "milestone-2027-2026-revenue-fixture",
        kind: "revenue" as const,
        qualifier: "reported" as const,
        valueUsd: 9_000_000_000,
      }],
      events: [{
        ...currentEvent,
        date: "2027-03-27",
        id: "milestone-2027-2026-revenue-fixture",
        title: "Fixture reports Stripe 2026 revenue of $9 billion",
      }, ...history.events],
    };
    const updatedSeo = deriveNetRevenuePageSeo(updatedHistory);
    const updatedMetadata = deriveNetRevenuePageMetadata(updatedHistory);

    expect(updatedSeo).toMatchObject({
      description: expect.stringContaining("$9 billion 2026 revenue"),
      lead: expect.stringMatching(
        /\$9 billion in 2026.*not affiliated with, endorsed by, or operated by/su,
      ),
      title: "Stripe Net Revenue and Revenue by Year, 2021–2026",
      yearRange: "2021–2026",
    });
    expect(updatedMetadata).toMatchObject({
      description: expect.stringContaining("$9 billion 2026 revenue"),
      openGraph: {
        title: "Stripe Net Revenue and Revenue by Year, 2021–2026 | hraness.com/stripe",
      },
      title: "Stripe Net Revenue and Revenue by Year, 2021–2026",
    });
    expect(updatedSeo).not.toEqual(priorSeo);
  });

  test("renders three source-linked annual disclosures and methodology", async () => {
    const history = await loadHistory();
    const seo = deriveNetRevenuePageSeo(history);
    const latest = history.annualRevenues.at(-1);
    if (latest === undefined) throw new Error("Missing latest annual revenue fixture");
    const html = renderToStaticMarkup(await NetRevenuePage());

    expect(html).toContain(`<h1 class="history-page-title" id="net-revenue-page-heading">${seo.title}</h1>`);
    expect(html).not.toContain('class="stripe-history-visually-hidden"');
    expect(html).toContain(seo.lead);
    expect(html).toContain(seo.description);
    expect(html).toContain("<table>");
    expect(html).toContain('<th scope="col">year</th>');
    expect(html).toContain('<th scope="col">amount</th>');
    expect(html).toContain('<th scope="col">kind</th>');
    expect(html).toContain('<th scope="col">qualifier</th>');
    expect(html).toContain('<th scope="col">sources</th>');
    expect(html).toContain(`<tr id="${latest.eventId}"`);
    expect(html).toContain(`"numberOfItems":${history.annualRevenues.length}`);
    expect(html).toContain(`https://hraness.com/stripe/history/net-revenue#${latest.eventId}`);
    expect(html).toContain(`${latest.calendarYear}: ${latest.display} revenue`);
    expect(html.match(/class="history-volume-chart-track"/gu)?.length).toBe(3);
    expect(html.match(/<tr(?:\s|>)/gu)?.length).toBe(4);
    expect(html.match(/class="history-volume-disclosure-list"/gu)?.length).toBe(1);
    expect(html).toContain("~$2.5 billion");
    expect(html).toContain("$5.1 billion");
    expect(html).toContain("$2.2 billion");
    expect(html).toContain("$6.8 billion");
    expect(html).toContain("$3.2 billion");
    expect(html).toContain("net revenue");
    expect(html).toContain("revenue");
    expect(html).toContain("approximate");
    expect(html).toContain("reported");
    expect(html).toContain("Forbes reports Stripe 2021 net revenue of nearly $2.5 billion");
    expect(html).toContain("Axios and The Information report Stripe 2024 revenue of $5.1 billion");
    expect(html).toContain("The Information reports Stripe 2025 revenue of $6.8 billion");
    expect(html).toContain("The Information titled this as cash generated in 2025");
    expect(html).toContain("what Stripe keeps after the cut passed to partners");
    expect(html).toContain("Irish statutory accounts");
    expect(html).toContain("Missing years are gaps");
    expect(html).toContain("H1 2026 growth rates stay on the events");
    expect(html).toContain("publicly visible Information article does not state that quarter");
    expect(html).toContain("The Q3 2023 figure of roughly $1 billion stays on its timeline event");
    expect(html).toContain("take rates are never computed");
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain("bars use a linear scale");
    expect(html).toContain('data-value-usd="2500000000"');
    expect(html).toContain('data-value-usd="5100000000"');
    expect(html).toContain('data-value-usd="6800000000"');
    expect(html).toContain('href="#milestone-2022-forbes-2021-net-revenue"');
    expect(html).toContain('href="#milestone-2025-axios-2024-revenue"');
    expect(html).toContain('href="#milestone-2026-information-2025-revenue"');
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-history-net-revenue-structured-data"');
    expect(html).toContain('aria-current="true" aria-label="net revenue: 3 annual disclosures, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="net-revenue"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="payment-volume"')).toBeLessThan(
      html.indexOf('data-filter-id="net-revenue"'),
    );
    expect(html.indexOf("yearly disclosures")).toBeLessThan(html.indexOf("revenue by year"));
    expect(html.indexOf("revenue by year")).toBeLessThan(html.indexOf("disclosures and sources"));
    expect(html).toContain("$5.12 billion");
    expect(html).not.toContain("<td>$5.12 billion</td>");
    expect(html).not.toContain("<td>$6.9 billion</td>");
    expect(html).not.toContain("the singularity");
    expect(html).not.toContain("The Information reports Stripe Q3 2023 net revenue of roughly $1 billion");
  });
});
