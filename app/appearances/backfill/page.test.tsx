import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AppearanceBackfillPage, { metadata } from "./page";

describe("leadership appearance backfill page", () => {
  test("keeps unreviewed discovery results public but out of search results", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "/appearances/backfill" },
      robots: { follow: true, index: false },
      title: "Leadership Appearance Backfill",
    });
  });

  test("renders the complete normalized review queue with provenance", async () => {
    const html = renderToStaticMarkup(await AppearanceBackfillPage());

    expect(html).toContain('<h1 id="appearance-backfill-heading">Leadership Appearance Backfill</h1>');
    expect(html).toContain("31 candidates");
    expect(html).toContain("47 raw hits");
    expect(html).toContain("not accepted historical records");
    expect(html.match(/source review needed/gu)).toHaveLength(31);
    expect(html).toContain('href="https://www.youtube.com/watch?v=YgYiF86h0yU"');
    expect(html).toContain('href="https://www.youtube.com/watch?v=y_4emS6D4og"');
    expect(html).toContain(
      'href="https://github.com/hraness/stripe-history/actions/runs/32265726670"',
    );
    expect(html).not.toContain("OpenAI Co-founder Greg Brockman");
  });
});
