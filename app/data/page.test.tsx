import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";

import DataPage, { metadata } from "./page";

describe("Stripe company history dataset", () => {
  test("publishes a canonical dataset search result", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/data" },
      title: "Stripe Company History Dataset",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://hraness.com/stripe/data",
    });
  });

  test("renders every category as a crawlable page and YAML download", async () => {
    const html = renderToStaticMarkup(await DataPage());
    const history = await loadHistory();

    expect(html).toContain('<h1 id="data-heading">Stripe Company History Dataset</h1>');
    expect(html).toContain(`${history.events.length} sourced events`);
    expect(html).toContain("confidence, and status when applicable");
    expect(html).toContain("Questions this history answers");
    expect(html).toContain("How did Stripe start, and who has led the company?");
    expect(html).toContain("What companies has Stripe acquired?");
    expect(html).toContain("How have Stripe&#x27;s funding and valuation changed?");
    expect(html).toContain("How much payment volume has Stripe processed?");
    expect(html).toContain("When did Stripe launch products and expand globally?");
    expect(html).toContain('href="/history/origins-and-early-company"');
    expect(html).toContain('href="/history/executives-and-team"');
    expect(html.match(/download YAML/gu)).toHaveLength(12);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/stripe/history/acquisitions.yml"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('href="/stripe/research/sources.yml"');
    expect(html).toContain('href="/stripe/research/valuations.yml"');
    expect(html).toContain('href="/stripe/research/appearances.yml"');
    expect(html).toContain('href="/history/appearances"');
    expect(html).not.toContain('href="/appearances/backfill"');
    expect(html).not.toContain('href="/stripe/research/appearance-backfill.yml"');
    expect(html).toContain('href="/stripe/research/collections.yml"');
    expect(html).toContain('href="/stripe/research/runs.yml"');
    expect(html).toContain(`${history.sources.length} canonical sources`);
    expect(html).toContain(`${history.valuations.length} observations`);
    expect(html).toContain('href="https://github.com/hraness/stripedex"');
    expect(html).toContain('id="stripedex-dataset-structured-data"');
  });
});
