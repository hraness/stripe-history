import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";

import PaymentVolumePage, {
  generateMetadata,
} from "./page";
import {
  derivePaymentVolumePageMetadata,
  derivePaymentVolumePageSeo,
} from "./payment-volume-page-model";

describe("hraness.com/stripe payment volume history", () => {
  test("publishes a canonical, descriptive search result from the dataset", async () => {
    const metadata = await generateMetadata();
    const seo = derivePaymentVolumePageSeo(await loadHistory());

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/history/payment-volume" },
      description: seo.description,
      title: seo.title,
    });
    expect(metadata.openGraph).toMatchObject({
      title: `${seo.title} | hraness.com/stripe`,
      url: "https://hraness.com/stripe/history/payment-volume",
    });
  });

  test("updates the range and latest claim when the volume fixture advances", async () => {
    const history = await loadHistory();
    const priorSeo = derivePaymentVolumePageSeo(history);
    const currentLatest = history.annualVolumes.at(-1);
    const currentEvent = history.events.find(({ id }) => id === currentLatest?.eventId);
    if (currentLatest === undefined || currentEvent === undefined) {
      throw new Error("Missing latest annual volume fixture");
    }

    const updatedHistory = {
      annualVolumes: [...history.annualVolumes, {
        calendarYear: 2026,
        categoryId: currentLatest.categoryId,
        display: "$2.5 trillion",
        eventId: "milestone-2027-2026-volume-fixture",
        kind: "total-volume" as const,
        qualifier: "published-value" as const,
        valueUsd: 2_500_000_000_000,
      }],
      events: [{
        ...currentEvent,
        date: "2027-02-24",
        id: "milestone-2027-2026-volume-fixture",
        title: "Fixture reports $2.5 trillion in 2026 total volume",
      }, ...history.events],
    };
    const updatedSeo = derivePaymentVolumePageSeo(updatedHistory);
    const updatedMetadata = derivePaymentVolumePageMetadata(updatedHistory);

    expect(updatedSeo).toMatchObject({
      description: expect.stringContaining("$2.5 trillion 2026 total volume"),
      lead: expect.stringMatching(
        /\$2\.5 trillion in 2026.*not affiliated with, endorsed by, or operated by/su,
      ),
      title: "Stripe Payment and Total Volume by Year, 2021–2026",
      yearRange: "2021–2026",
    });
    expect(updatedMetadata).toMatchObject({
      description: expect.stringContaining("$2.5 trillion 2026 total volume"),
      openGraph: {
        title: "Stripe Payment and Total Volume by Year, 2021–2026 | hraness.com/stripe",
      },
      title: "Stripe Payment and Total Volume by Year, 2021–2026",
    });
    expect(updatedSeo).not.toEqual(priorSeo);
  });

  test("renders five source-linked annual observations and methodology", async () => {
    const history = await loadHistory();
    const seo = derivePaymentVolumePageSeo(history);
    const latest = history.annualVolumes.at(-1);
    if (latest === undefined) throw new Error("Missing latest annual volume fixture");
    const html = renderToStaticMarkup(await PaymentVolumePage());

    expect(html).toContain(`<h1 class="history-page-title" id="payment-volume-heading">${seo.title}</h1>`);
    expect(html).not.toContain('class="stripe-history-visually-hidden"');
    expect(html).toContain(seo.lead);
    expect(html).toContain(seo.description);
    expect(html).toContain("<table>");
    expect(html).toContain('<th scope="col">year</th>');
    expect(html).toContain('<th scope="col">volume</th>');
    expect(html).toContain('<th scope="col">kind</th>');
    expect(html).toContain('<th scope="col">qualifier</th>');
    expect(html).toContain('<th scope="col">sources</th>');
    expect(html).toContain(`<tr id="${latest.eventId}"`);
    expect(html).toContain(`"numberOfItems":${history.annualVolumes.length}`);
    expect(html).toContain(`https://hraness.com/stripe/history/payment-volume#${latest.eventId}`);
    expect(html).toContain(`${latest.calendarYear}: ${latest.display} total volume`);
    expect(html.match(/class="history-volume-chart-track"/gu)?.length).toBe(5);
    expect(html.match(/<tr(?:\s|>)/gu)?.length).toBe(6);
    expect(html.match(/class="history-volume-disclosure-list"/gu)?.length).toBe(1);
    expect(html).toContain("$640 billion+");
    expect(html).toContain("$1.9 trillion");
    expect(html).toContain("payment volume");
    expect(html).toContain("total volume");
    expect(html).toContain("lower bound");
    expect(html).toContain("published value");
    expect(html).toContain("Stripe reports $1.9 trillion in 2025 total volume");
    expect(html).toContain("Stripe reports more than $640 billion in 2021 payment volume");
    expect(html).toContain("more than five million businesses");
    expect(html).toContain("Share of global GDP");
    expect(html).toContain("1.6%");
    expect(html).toContain("Apr 2022");
    expect(html).toContain("Feb 24, 2026");
    expect(html).toContain("Stripe calls the 2025 figure");
    expect(html).toContain("2021 and 2022 figures are lower bounds");
    expect(html).toContain("Missing years are not inferred");
    expect(html).toContain('href="/history/net-revenue"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain("bars use a linear scale");
    expect(html).toContain('data-value-usd="640000000000"');
    expect(html).toContain('data-value-usd="1900000000000"');
    expect(html).toContain('href="#milestone-2026-2025-volume-1-9-trillion"');
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-history-payment-volume-structured-data"');
    expect(html).toContain('aria-current="true" aria-label="annual volume: 5 annual disclosures, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="payment-volume"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="payment-volume"'),
    );
    expect(html.indexOf('yearly disclosures')).toBeLessThan(html.indexOf("volume by year"));
    expect(html.indexOf("volume by year")).toBeLessThan(html.indexOf("disclosures and sources"));
    expect(html).not.toContain('class="stripe-history-selector"');
    expect(html).toContain('class="hraness-marketing-header stripe-history-header"');
    expect(html).toContain('href="/about">about</a>');
    expect(html).toContain('aria-label="Stripe History resources"');
    expect(html).toContain('data-slot="hraness-site-footer"');
    expect(html).not.toContain('class="stripe-history-breadcrumbs"');
    expect(html).not.toContain('class="stripe-history-section-heading"');
    expect(html).toContain("~$400 billion");
    expect(html).not.toMatch(/2024 total payment volume of \$400 billion/u);
  });
});
