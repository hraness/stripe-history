import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { loadHistory } from "@/lib/content";

import HistoryCategoryPage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("stripedex.com category history", () => {
  test("generates every canonical category route", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(12);
    expect(params).toContainEqual({ category: "acquisitions" });
    expect(params).toContainEqual({ category: "appearances" });
    expect(params).not.toContainEqual({ category: "payment-volume" });
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
      alternates: { canonical: "/history/appearances" },
      title: `Stripe Appearances Timeline: ${appearanceCount} Sourced Events`,
    });
    expect(html.match(/data-category="appearances"/gu)).toHaveLength(appearanceCount);
    expect(html).toContain('data-filter-id="appearances"');
    expect(html).toContain('id="appearance-2026-08-will-gaybrick-a16z"');
    expect(html).toContain("Tokens Are the New Dollars");
    expect(html).toContain("Will Gaybrick · President of Product and Business");
    expect(html).toContain("53 min · automatic transcript");
    expect(html).toContain('href="https://www.youtube.com/watch?v=P5iICDVn5gc"');
    expect(html).toContain('id="stripedex-history-category-structured-data"');
    expect(html).toContain('"@type":"PodcastEpisode"');
    expect(html).not.toContain('class="stripedex-appearance-list"');
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
    expect(metadata).toMatchObject({
      alternates: { canonical: "/history/acquisitions" },
      description: "Completed acquisitions, talent acquisitions, announced agreements, and credibly reported deal discussions involving Stripe.",
      title: `Stripe Acquisitions Timeline: ${acquisitionCount} Sourced Events`,
    });
    expect(metadata.openGraph).toMatchObject({
      title: `Stripe Acquisitions Timeline: ${acquisitionCount} Sourced Events | stripedex.com`,
      url: "/history/acquisitions",
    });
  });

  test("renders a crawlable category-only timeline", async () => {
    const history = await loadHistory();
    const acquisitionCount = history.events.filter(
      ({ categoryId }) => categoryId === "acquisitions",
    ).length;
    const html = renderToStaticMarkup(await HistoryCategoryPage({
      params: Promise.resolve({ category: "acquisitions" }),
    }));
    const eventCount = html.match(/class="history-event"/gu)?.length ?? 0;
    const categorizedEventCount = html.match(/data-category="acquisitions"/gu)?.length ?? 0;

    expect(eventCount).toBe(acquisitionCount);
    expect(categorizedEventCount).toBe(eventCount);
    expect(html).toContain('<h1 class="stripedex-visually-hidden" id="history-heading">Stripe acquisitions history</h1>');
    expect(html).toContain(`aria-current="true" aria-label="acquisitions: ${acquisitionCount} events, selected; activate to show all history" data-analytics-event="history filter selected" data-analytics-id="all"`);
    expect(html).toMatch(/data-filter-id="acquisitions"[^>]* href="\/"/u);
    expect(html.indexOf('data-filter-id="all"')).toBeLessThan(
      html.indexOf('data-filter-id="acquisitions"'),
    );
    expect(html).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(html).toContain('id="stripedex-history-category-structured-data"');
    expect(html).not.toContain('class="stripedex-selector"');
    expect(html).toContain('class="stripedex-header"');
    expect(html).toContain('href="/about">about</a>');
    expect(html).toContain('class="hraness-brand stripedex-footer-hraness"');
    expect(html).not.toContain('class="stripedex-breadcrumbs"');
    expect(html).not.toContain('class="stripedex-section-heading"');
    expect(html).not.toMatch(/\d+ of \d+ events/u);
    expect(html).not.toContain("A month in Buenos Aires");
  });
});
