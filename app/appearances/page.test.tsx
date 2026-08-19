import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AppearancesPage, { metadata } from "./page";

describe("Stripe leadership appearances", () => {
  test("publishes a canonical search surface", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "/appearances" },
      title: "Stripe Leadership Appearances",
    });
  });

  test("renders the reviewed Will Gaybrick appearance and source", async () => {
    const html = renderToStaticMarkup(await AppearancesPage());

    expect(html).toContain('id="appearance-2026-08-will-gaybrick-a16z"');
    expect(html).toContain("Tokens Are the New Dollars");
    expect(html).toContain("Will Gaybrick");
    expect(html).toContain("President of Product and Business");
    expect(html).toContain("Measure autonomous work at the merge boundary");
    expect(html).toContain('href="https://www.youtube.com/watch?v=P5iICDVn5gc"');
    expect(html).toContain("automatic transcript");
    expect(html).toContain('id="stripe-history-appearances-structured-data"');
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"PodcastEpisode"');
    expect(html).toContain('"@type":"VideoObject"');
    expect(html).toContain('href="/appearances/backfill"');
    expect(html).toContain("Review 31 historical appearance candidates");
  });
});
