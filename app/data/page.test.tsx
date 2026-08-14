import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

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

    expect(html).toContain('<h1 id="data-heading">Stripe Company History Dataset</h1>');
    expect(html).toContain("230 sourced events");
    expect(html.match(/download YAML/gu)).toHaveLength(11);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/history/acquisitions.yml"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).toContain('id="stripe-guide-dataset-structured-data"');
  });
});
