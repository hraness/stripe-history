import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";

import ValuationPage, {
  generateMetadata,
} from "./page";
import {
  deriveValuationPageMetadata,
  deriveValuationPageSeo,
} from "./valuation-page-model";

describe("hraness.com/stripe valuation history", () => {
  test("publishes a canonical, descriptive search result from the dataset", async () => {
    const metadata = await generateMetadata();
    const seo = deriveValuationPageSeo(await loadHistory());

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/history/valuation" },
      description: seo.description,
      title: seo.title,
    });
    expect(metadata.openGraph).toMatchObject({
      title: `${seo.title} | hraness.com/stripe`,
      url: "https://hraness.com/stripe/history/valuation",
    });
  });

  test("updates the range and latest claim when the valuation fixture advances", async () => {
    const history = await loadHistory();
    const priorSeo = deriveValuationPageSeo(history);
    const currentLatest = history.valuations.find(
      ({ id }) => id === history.valuationHeadlines.at(-1)?.observationId,
    );
    if (currentLatest === undefined) throw new Error("Missing latest valuation fixture");

    const updatedHistory = {
      valuations: [{
        ...currentLatest,
        effective_date: "2027-04-01",
        id: "valuation-2027-fixture-tender",
        title: "Fixture tender values Stripe at $200 billion",
        valuation: {
          ...currentLatest.valuation,
          display: "$200 billion",
          value_usd: 200_000_000_000,
        },
      }, ...history.valuations],
    };
    const updatedSeo = deriveValuationPageSeo(updatedHistory);
    const updatedMetadata = deriveValuationPageMetadata(updatedHistory);

    expect(updatedSeo).toMatchObject({
      description: expect.stringContaining("$200 billion 2027 company tender"),
      lead: expect.stringMatching(
        /\$200 billion in 2027.*not affiliated with, endorsed by, or operated by/su,
      ),
      title: "Stripe Valuation History by Year, 2011–2027",
      yearRange: "2011–2027",
    });
    expect(updatedMetadata).toMatchObject({
      description: expect.stringContaining("$200 billion 2027 company tender"),
      openGraph: {
        title: "Stripe Valuation History by Year, 2011–2027 | hraness.com/stripe",
      },
      title: "Stripe Valuation History by Year, 2011–2027",
    });
    expect(updatedSeo).not.toEqual(priorSeo);
  });

  test("renders every sourced observation with typed valuation context", async () => {
    const history = await loadHistory();
    const seo = deriveValuationPageSeo(history);
    const latestHeadline = history.valuationHeadlines.at(-1);
    if (latestHeadline === undefined) throw new Error("Missing latest valuation headline");
    const html = renderToStaticMarkup(await ValuationPage());

    expect(html).toContain(`<h1 class="history-page-title" id="valuation-page-heading">${seo.title}</h1>`);
    expect(html).not.toContain('class="stripe-history-visually-hidden"');
    expect(html).toContain(seo.lead);
    expect(html).toContain(seo.description);
    expect(html).toContain("<table>");
    expect(html).toContain('<th scope="col">year</th>');
    expect(html).toContain('<th scope="col">valuation</th>');
    expect(html).toContain('<th scope="col">basis</th>');
    expect(html).toContain('<th scope="col">status</th>');
    expect(html).toContain('<th scope="col">sources</th>');
    expect(html).toContain(`<tr id="${latestHeadline.observationId}"`);
    expect(html).toContain(`"numberOfItems":${history.valuationHeadlines.length}`);
    expect(html).toContain(`https://hraness.com/stripe/history/valuation#${latestHeadline.observationId}`);
    expect(html).toContain(`${latestHeadline.calendarYear}: ${latestHeadline.display}`);
    expect(html.match(/class="history-volume-chart-track"/gu)?.length).toBe(14);
    expect(html.match(/class="history-valuation-basis-badge"/gu)?.length).toBe(25);
    expect(html).toContain("company tender");
    expect(html).toContain("409A mark");
    expect(html).toContain("investor secondary");
    expect(html).toContain("secondary market");
    expect(html).toContain("common-stock 409A");
    expect(html).toContain("transaction implied");
    expect(html).toContain("$159 billion");
    expect(html).toContain("~$20 million");
    expect(html).toContain("more than $6.5 billion");
    expect(html).toContain("$861 million");
    expect(html).toContain("up to $500 million");
    expect(html).toContain("more than $80 million");
    expect(html).toContain("$18 million");
    expect(html).toContain("~$2 million");
    expect(html).toContain("financing / tender");
    expect(html).toContain("financing amount");
    expect(html).toContain("completed financing");
    expect(html).toContain("reported terms");
    expect(html).toContain("agreements signed");
    expect(html).toContain("signed agreements");
    expect(html).toContain("transaction status");
    expect(html).toContain("Sep 2025");
    expect(html).toContain("Sep 23, 2025");
    expect(html).toContain("source authority");
    expect(html).toContain("Missing years stay missing");
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('href="/history/net-revenue"');
    expect(html).toContain("bars use a linear scale");
    expect(html).toContain("linear scale from zero to the largest selected value");
    expect(html).not.toMatch(/logarithmic|log scale/iu);
    expect(html).toContain('data-value-usd="20000000"');
    expect(html).toContain('data-value-usd="159000000000"');
    expect(html).toContain('data-analytics-kind="valuation"');
    expect(html).toContain('id="stripe-history-valuation-structured-data"');
    expect(html).toContain('aria-current="true" aria-label="valuation: 25 observations, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"');
    expect(html).toMatch(/data-filter-id="valuation"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="valuation"'),
    );
    expect(html).not.toContain("company priced");
    expect(html).not.toContain("company coordinated");
    expect(html).not.toContain("capital raised");
    expect(html).toContain('class="hraness-marketing-header stripe-history-header"');
    expect(html).toContain('href="/about">about</a>');
    expect(html).toContain('aria-label="Stripe History resources"');
    expect(html).toContain('data-slot="hraness-site-footer"');
    expect(html).not.toContain('class="stripe-history-breadcrumbs"');
    expect(html).not.toContain('class="stripe-history-section-heading"');
  });
});
