import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { loadHistory } from "@/lib/content";

import HistoryCategoryPage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("hraness.com/stripe category history", () => {
  test("generates every canonical category route", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(12);
    expect(params).toContainEqual({ category: "acquisitions" });
    expect(params).toContainEqual({ category: "appearances" });
    expect(params).not.toContainEqual({ category: "payment-volume" });
    expect(params).not.toContainEqual({ category: "net-revenue" });
  });

  test("renders appearances inside the shared category timeline", async () => {
    const history = await loadHistory();
    const appearanceCount = history.events.filter(
      ({ categoryId }) => categoryId === "appearances",
    ).length;
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: "appearances" }),
    });
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "appearances" }),
    }));

    expect(appearanceCount).toBe(history.appearances.length);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/history/appearances" },
      title: { absolute: `Stripe appearances: ${appearanceCount} sourced events` },
    });
    expect(html.match(/data-category="appearances"/gu)).toHaveLength(appearanceCount);
    expect(html).toContain('data-filter-id="appearances"');
    expect(html).toContain('id="appearance-2026-08-will-gaybrick-a16z"');
    expect(html).toContain("Tokens Are the New Dollars");
    expect(html).toContain("Will Gaybrick · President of Product and Business");
    expect(html).toContain("53 min · automatic transcript");
    expect(html).toContain('href="https://www.youtube.com/watch?v=P5iICDVn5gc"');
    expect(html).toContain('id="stripe-history-history-category-structured-data"');
    expect(html).toContain('"@type":"PodcastEpisode"');
    expect(html).not.toContain('class="stripe-history-appearance-list"');
    expect(html).not.toContain('href="/appearances"');
  });

  test("publishes category-specific metadata", async () => {
    const history = await loadHistory();
    const acquisitionCount = history.events.filter(
      ({ categoryId }) => categoryId === "acquisitions",
    ).length;
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: "acquisitions" }),
    });
    expect(acquisitionCount).toBeGreaterThan(0);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/history/acquisitions" },
      description: "Completed acquisitions, talent acquisitions, announced agreements, and credibly reported deal discussions involving Stripe.",
      title: { absolute: "Stripe acquisitions list, 2013–2026" },
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Stripe acquisitions list, 2013–2026",
      url: "https://hraness.com/stripe/history/acquisitions",
    });
  });

  test("keeps multi-word category titles in one consistent case", async () => {
    const history = await loadHistory();
    const answerCategories = new Set(["acquisitions", "fundraising", "origins-and-early-company"]);
    for (const category of history.categories.filter(({ id }) => !answerCategories.has(id))) {
      const count = history.events.filter(
        ({ categoryId }) => categoryId === category.id,
      ).length;
      const metadata = await generateMetadata({
        params: Promise.resolve({ category: category.id }),
      });
      expect(metadata.title).toEqual({
        absolute: `Stripe ${category.label.toLocaleLowerCase("en-US")}: ${count} sourced events`,
      });
    }
    const origins = await generateMetadata({
      params: Promise.resolve({ category: "origins-and-early-company" }),
    });
    expect(origins.title).toEqual({ absolute: "Stripe founding: founders, first prototype and 2011 launch" });
    const fundraising = await generateMetadata({
      params: Promise.resolve({ category: "fundraising" }),
    });
    expect(fundraising.title).toEqual({ absolute: "Stripe funding rounds and tender offers, 2011–2026" });
  }, 30_000);

  test("renders a crawlable category-only timeline", async () => {
    const history = await loadHistory();
    const acquisitionCount = history.events.filter(
      ({ categoryId }) => categoryId === "acquisitions",
    ).length;
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "acquisitions" }),
    }));
    const eventCount = html.match(/class="history-event(?: [^"]+)?"/gu)?.length ?? 0;
    const categorizedEventCount = html.match(/data-category="acquisitions"/gu)?.length ?? 0;

    expect(eventCount).toBe(acquisitionCount);
    expect(categorizedEventCount).toBe(eventCount);
    expect(html).toContain('<h1 class="history-page-title" id="history-heading">Stripe acquisitions</h1>');
    expect(html).toContain(`aria-current="true" aria-label="acquisitions: ${acquisitionCount} events, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"`);
    expect(html).toMatch(/data-filter-id="acquisitions"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="acquisitions"'),
    );
    expect(html).not.toContain('class="stripe-history-visually-hidden"');
    expect(html.indexOf('id="history-heading"')).toBeLessThan(
      html.indexOf('data-filter-id="all"'),
    );
    expect(html).not.toContain("Loading Stripe company history");
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).not.toContain(
      'href="/history/acquisitions/openrouter-acquisition-talks-reported"',
    );
    expect(html).toContain('id="stripe-history-history-category-structured-data"');
    expect(html).not.toContain('class="stripe-history-selector"');
    expect(html).toMatch(/class="hraness-marketing-header [^"]*\bstripe-history-header\b[^"]*"/u);
    expect(html).toMatch(/href="\/stripe\/about"[^>]*>about<\/a>/u);
    expect(html).toContain('aria-label="Stripe History resources"');
    expect(html).toContain('data-slot="hraness-site-footer"');
    expect(html).not.toContain('class="stripe-history-breadcrumbs"');
    expect(html).not.toContain('class="stripe-history-section-heading"');
    expect(html).not.toMatch(/\d+ of \d+ events/u);
    expect(html).not.toContain("A month in Buenos Aires");
  });

  test("answers when Stripe started before the origins timeline", async () => {
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "origins-and-early-company" }),
    }));
    const semanticHtml = html.replace(/ class="[^"]*"/gu, "");

    expect(html).toContain('<h1 class="history-page-title" id="history-heading">How Stripe started</h1>');
    expect(semanticHtml).toContain(
      '<p data-answer="origins">Patrick and John Collison <a href="#origins-buenos-aires-prototype">built Stripe’s first working prototype in Buenos Aires in January 2010</a>. John <a href="#origins-founders-go-full-time-and-first-hires-arrive">took leave from Harvard to work on it full time that fall</a>. The product, first called /dev/payments, <a href="#origins-devpayments-becomes-stripe">became Stripe in January 2011</a> and <a href="#origins-stripe-public-launch">launched publicly on September 30, 2011</a>.</p>',
    );
    expect(html.indexOf('data-answer="origins"')).toBeLessThan(html.indexOf('data-measure="payment-volume"'));
    expect(html).toContain('id="origins-stripe-public-launch"');
  });

  test("lists every acquisition event with its recorded status before the timeline", async () => {
    const history = await loadHistory();
    const acquisitions = history.events.filter(({ categoryId }) => categoryId === "acquisitions");
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "acquisitions" }),
    }));
    const semanticHtml = html.replace(/ class="[^"]*"/gu, "");

    expect(semanticHtml).toContain(
      `Stripe’s first acquisition was the Kickoff team in March 2013. This page lists ${acquisitions.length} acquisition events, from completed deals and team hires to announced agreements and reported talks, each with its status.`,
    );
    expect(semanticHtml).toContain("<caption>Stripe acquisition events</caption>");
    expect(semanticHtml).toContain('<th scope="col">Date</th><th scope="col">Deal</th><th scope="col">Status</th><th scope="col">Price</th>');
    expect(semanticHtml.match(/<th scope="row"><a href="#[a-z0-9-]+">/gu)).toHaveLength(acquisitions.length);
    expect(semanticHtml).toContain(
      '<th scope="row"><a href="#kickoff-acquisition-completed">Stripe makes its first acquisition with Kickoff</a></th><td>Talent acquisition completed</td><td>Not disclosed</td>',
    );
    expect(html.indexOf('data-answer="acquisitions"')).toBeLessThan(html.indexOf('data-measure="payment-volume"'));
  });
});
