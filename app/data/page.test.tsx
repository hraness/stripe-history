import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";

import DataPage, { metadata } from "./page";

describe("Stripe company history dataset", () => {
  test("publishes a canonical dataset search result", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "/data" },
      title: "Stripe Company History Dataset",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "/data",
    });
  });

  test("renders every category as a crawlable page and YAML download", async () => {
    const html = renderToStaticMarkup(await DataPage());
    const history = await loadHistory();

    expect(html).toContain('<h1 id="data-heading">Stripe Company History Dataset</h1>');
    expect(html).toContain(`${history.events.length} sourced events`);
    expect(html).toContain("confidence, and status when applicable");
    expect(html.match(/download YAML/gu)).toHaveLength(11);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/history/acquisitions.yml"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('href="/research/sources.yml"');
    expect(html).toContain('href="/research/valuations.yml"');
    expect(html).toContain('href="/research/appearances.yml"');
    expect(html).toContain('href="/research/collections.yml"');
    expect(html).toContain('href="/research/runs.yml"');
    expect(html).toContain(`${history.sources.length} canonical sources`);
    expect(html).toContain(`${history.valuations.length} observations`);
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).toContain('id="stripe-guide-dataset-structured-data"');
  });
});
