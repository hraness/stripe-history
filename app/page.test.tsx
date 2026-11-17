import { describe, expect, test } from "bun:test";
import { INDEXABLE_ROBOTS } from "@hraness/web-discovery";
import {
  loadHistory,
  loadResearchRuns,
  summarizeHistoryEvidence,
} from "@/lib/content";
import { renderToStaticMarkup } from "react-dom/server";

import Home, { generateMetadata } from "./page";
import { site } from "./site";

describe("canonical hraness.com/stripe history", () => {
  test("publishes root-canonical history metadata", async () => {
    const metadata = await generateMetadata();
    const expectedTitle = "Stripe History: founders, funding and a sourced timeline";

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe" },
      description: site.description,
      robots: INDEXABLE_ROBOTS,
      title: { absolute: expectedTitle },
    });
    expect(metadata.openGraph).toMatchObject({
      images: [{
        url: "https://hraness.com/stripe/opengraph-image",
      }],
      title: expectedTitle,
      url: "https://hraness.com/stripe",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{
        url: "https://hraness.com/stripe/opengraph-image",
      }],
      title: expectedTitle,
    });
  });

  test("renders the sourced timeline, measures, controls, and public attribution", async () => {
    const [history, researchRuns] = await Promise.all([
      loadHistory(),
      loadResearchRuns(),
    ]);
    const evidence = summarizeHistoryEvidence(history, researchRuns);
    const html = renderToStaticMarkup(await Home());
    const eventCount = html.match(/class="history-event(?: [^"]+)?"/gu)?.length ?? 0;
    const categoryIconCount = html.match(
      /class="stripe-history-icon history-category-icon(?: [^"]+)?"/gu,
    )?.length ?? 0;

    expect(eventCount).toBe(history.events.length);
    expect(eventCount).toBeGreaterThanOrEqual(200);
    expect(html).toContain('class="stripe-history-page stripe-history-main stripe-history-history-main"');
    expect(html).toMatch(/<header class="hraness-marketing-header [^"]*\bstripe-history-header\b[^"]*" data-hraness-marketing="header"[^>]*>/u);
    expect(html).toMatch(/class="hraness-marketing-header__brand [^"]+" data-foil="" href="\/stripe" aria-label="Stripe History home"><span>Stripe History<\/span><\/a>/u);
    expect(html).toMatch(/class="stripe-history-header-cta" data-analytics-cta="header-more-from-hraness" href="https:\/\/hraness\.com\/?"/u);
    expect(html).toMatch(/aria-label="primary navigation" class="hraness-marketing-header__nav [^"]+"/u);
    expect(html).toMatch(/<header aria-labelledby="history-heading" class="hraness-marketing-hero history-orientation [^"]+"/u);
    expect(html.match(/<h1 class="hraness-marketing-hero__heading [^"]+" id="history-heading">([^<]*)<\/h1>/u)?.[1]).toBe("Stripe History");
    expect(html).toContain(renderToStaticMarkup(<>{site.heroHeading}</>));
    expect(html).not.toContain('data-align="center"');
    expect(html).not.toContain("hraness-marketing-hero__eyebrow");
    expect(html).not.toContain("hraness-marketing-hero__name");
    expect(html).not.toContain("How this record is kept");
    expect(html).toMatch(/class="[^"]*\bstripe-history-ask-ai\b[^"]*" aria-label="Ask AI about this"/u);
    expect(html).toMatch(/<section aria-labelledby="history-heading" class="stripe-history-section [^"]+" id="timeline">/u);
    const glanceHtml = html.replace(/ class="[^"]*"/gu, "");
    expect(glanceHtml).toContain("<caption>Stripe at a glance</caption>");
    expect(glanceHtml).toContain('<th scope="row">Founders</th><td><a href="#origins-buenos-aires-prototype">Patrick and John Collison</a></td>');
    expect(glanceHtml).toContain('<th scope="row">Public launch</th><td><a href="#origins-stripe-public-launch">September 30, 2011</a></td>');
    expect(glanceHtml).toMatch(/<th scope="row">Latest valuation<\/th><td><a href="\/stripe\/history\/valuation#[a-z0-9-]+">\$[0-9.]+ billion \(\d{4}, [a-z0-9 ]+\)<\/a><\/td>/u);
    expect(html.indexOf('data-answer="at-a-glance"')).toBeGreaterThan(html.indexOf('id="history-heading"'));
    expect(html.indexOf('data-answer="at-a-glance"')).toBeLessThan(html.indexOf('id="timeline"'));
    expect(html).not.toContain("hraness-marketing-action");
    expect(evidence.eventCount).toBe(history.events.length);
    expect(html).toContain('href="/contact#corrections-and-sources">Report a correction</a>');
    expect(html).toContain('data-hraness-marketing="questions"');
    expect(html).toMatch(/<summary class="hraness-marketing-question__summary [^"]+">What counts as an event\?<\/summary>/u);
    expect(html).toMatch(/<summary class="hraness-marketing-question__summary [^"]+">How are sources checked\?<\/summary>/u);
    expect(html).toMatch(/<summary class="hraness-marketing-question__summary [^"]+">How do I report a correction\?<\/summary>/u);
    expect(html).not.toContain("Who made it?");
    expect(html.match(/<summary class="hraness-marketing-question__summary /gu)).toHaveLength(3);
    expect(html).not.toContain("hraness-marketing-maker__eyebrow");
    expect(html).not.toContain("hraness-marketing-questions__eyebrow");
    expect(html).toContain('href="https://github.com/hraness/stripe-history/issues"');
    // The maker note lives on About; the home closing keeps only the FAQ.
    expect(html).not.toContain("Built by Hraness");
    expect(html).toContain(`aria-current="true" aria-label="all: ${history.events.length} events"`);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/history/appearances"');
    expect(html).toContain('href="/history/payment-volume"');
    expect(html).toContain('href="/history/net-revenue"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('id="history-year-2026"');
    expect(html).toContain('id="history-year-2005"');
    expect(html).toMatch(/class="history-event-type [^"]+"/u);
    expect(categoryIconCount).toBeGreaterThan(eventCount);
    expect(html).toContain('data-filter-id="payment-and-payout-expansion"');
    expect(html).toContain(`aria-label="net revenue: ${history.annualRevenues.length} annual disclosures"`);
    expect(html).toContain(`aria-label="valuation: ${history.valuations.length} observations"`);
    expect(html).toMatch(
      /class="history-event [^"]+" data-category="payment-and-payout-expansion" style="--history-category-hue:[0-9.]+"/u,
    );
    expect(html).toContain('data-measure="payment-volume"');
    expect(html).toContain('data-measure="net-revenue"');
    expect(html).toContain('data-measure="valuation"');
    expect(html).toMatch(/class="history-event-confidence [^"]+">reported<\/span>/u);
    expect(html).toContain('id="milestone-2026-2025-volume-1-9-trillion"');
    expect(html.match(/class="history-volume-track"/gu)?.length).toBe(
      history.annualVolumes.length
        + history.annualRevenues.length
        + history.valuationHeadlines.length,
    );
    expect(html).not.toContain("Loading Stripe company history");
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).not.toContain(
      'href="/history/acquisitions/openrouter-acquisition-talks-reported"',
    );
    expect(html).toContain("Tokens Are the New Dollars");
    expect(html).toContain('data-category="appearances"');
    expect(html).toContain("A month in Buenos Aires produces Stripe&#x27;s first working prototype");
    expect(html).toMatch(/class="history-event-sources [^"]+"/u);
    expect(html.match(/class="history-event-sources [^"]+"/gu)).toHaveLength(history.events.length);
    expect(html).toContain('data-analytics-event="source link opened"');
    expect(html).toContain('id="stripe-history-history-structured-data"');
    expect(html).toContain('aria-label="Appearance: System"');
    expect(html).toContain('data-theme-value="system"');
    expect(html).toContain('id="stripe-history-footer"');
    expect(html).not.toContain('data-slot="hraness-site-footer"');
    expect(html).toContain('href="https://hraness.com/"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).not.toContain('class="stripe-history-selector"');
    expect(html).not.toContain('/atom.xml');
    expect(html).not.toContain('/news.yml');
    expect(html).not.toContain("hraness.substack.com/embed");
    expect(html).not.toContain("account.hraness.com/api/mailing/subscribe");
    expect(html).not.toContain("cf-turnstile");
    expect(html.indexOf('class="history-volume"')).toBeLessThan(
      html.indexOf('class="history-years '),
    );
    expect(html.indexOf('class="hraness-marketing-hero history-orientation ')).toBeGreaterThan(-1);
    expect(html.indexOf('class="hraness-marketing-hero history-orientation ')).toBeLessThan(
      html.indexOf('class="history-filters '),
    );
    expect(html.indexOf('class="history-years ')).toBeGreaterThan(-1);
    expect(html.indexOf('class="history-filters ')).toBeGreaterThan(-1);
    expect(html.indexOf('class="history-years ')).toBeLessThan(
      html.indexOf('data-hraness-marketing="questions"'),
    );
    expect(html.indexOf('data-hraness-marketing="questions"')).toBeLessThan(
      html.indexOf('id="stripe-history-footer"'),
    );
    expect(html).not.toContain('data-hraness-marketing="maker"');
  });
});
