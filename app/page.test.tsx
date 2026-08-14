import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Home, { generateMetadata } from "./page";

describe("canonical stripehistory.com history", () => {
  test("publishes root-canonical history metadata", async () => {
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      alternates: { canonical: "/" },
      title: "Stripe Company History: 230 Sourced Events",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Stripe Company History: 230 Sourced Events | stripehistory.com",
      url: "/",
    });
  });

  test("renders the sourced timeline without a section selector or feed UI", async () => {
    const html = renderToStaticMarkup(await Home());
    const eventCount = html.match(/class="history-event"/gu)?.length ?? 0;

    expect(eventCount).toBeGreaterThanOrEqual(200);
    expect(html).toContain('class="plain-page stripe-guide-main stripe-guide-history-main"');
    expect(html).toContain('<p class="stripe-guide-wordmark"><a href="/">stripehistory.com</a></p>');
    expect(html).toContain('<h1 id="history-heading">Stripe company history</h1>');
    expect(html).toContain("An independent, sourced timeline of Stripe acquisitions");
    expect(html).toContain('aria-current="page" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('id="history-year-2026"');
    expect(html).toContain('id="history-year-2005"');
    expect(html).toContain('class="history-event-type"');
    expect(html).toContain('class="history-event-confidence">reported</span>');
    expect(html).toContain('id="milestone-2026-2025-volume-1-9-trillion"');
    expect(html.match(/class="history-volume-track"/gu)?.length).toBe(5);
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).toContain("A month in Buenos Aires produces Stripe&#x27;s first working prototype");
    expect(html).toContain('class="history-event-sources"');
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-guide-history-structured-data"');
    expect(html).toContain('aria-label="hraness"');
    expect(html).toContain('class="hraness-brand" href="https://hraness.com"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).not.toContain('class="stripe-guide-selector"');
    expect(html).not.toContain('/atom.xml');
    expect(html).not.toContain('/news.yml');
    expect(html).not.toContain("<form");
    expect(html.indexOf('class="history-years"')).toBeLessThan(
      html.indexOf('class="history-volume"'),
    );
  });
});
