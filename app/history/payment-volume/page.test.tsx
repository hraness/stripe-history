import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PaymentVolumePage, { metadata } from "./page";

describe("stripehistory.com payment volume history", () => {
  test("publishes a canonical search result", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "/history/payment-volume" },
      description: "Stripe annual volume history: payment volume from 2021 through 2024 and total volume for 2025, with source-linked disclosures from $640 billion+ to $1.9 trillion.",
      title: "Stripe Payment and Total Volume by Year",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Stripe Payment and Total Volume by Year | stripehistory.com",
      url: "/history/payment-volume",
    });
  });

  test("renders five source-linked annual observations and methodology", async () => {
    const html = renderToStaticMarkup(await PaymentVolumePage());

    expect(html).toContain('<h1 class="stripe-history-visually-hidden" id="payment-volume-heading">Stripe Payment and Total Volume by Year</h1>');
    expect(html.match(/class="history-volume-chart-track"/gu)?.length).toBe(5);
    expect(html.match(/<tr(?:\s|>)/gu)?.length).toBe(6);
    expect(html).toContain("$640 billion+");
    expect(html).toContain("$1.9 trillion");
    expect(html).toContain("Stripe calls the 2025 figure");
    expect(html).toContain("2021 and 2022 figures are lower bounds");
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-guide-payment-volume-structured-data"');
    expect(html).toContain('aria-current="true" aria-label="annual volume: 5 annual disclosures, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="payment-volume"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="payment-volume"'),
    );
    expect(html).not.toContain('class="stripe-guide-selector"');
    expect(html).toContain('class="stripe-guide-header"');
    expect(html).toContain('href="/about">about</a>');
    expect(html).toContain('class="hraness-brand stripe-guide-footer-hraness"');
    expect(html).not.toContain('class="stripe-guide-breadcrumbs"');
    expect(html).not.toContain('class="stripe-guide-section-heading"');
    expect(html).not.toContain("$400 billion");
  });
});
