import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { EditorialParagraph } from "./editorial-paragraph";
import { isFilePath, SITE_ORIGIN } from "./site";

describe("editorial links", () => {
  test("a path that ends in an extension names a file", () => {
    for (const path of ["/stripe/llms.txt", "/stripe/sitemap.xml", "/history/acquisitions.yml", "/about.md"]) {
      expect(isFilePath(path)).toBe(true);
    }
    for (const path of ["/", "/stripe", "/about", "/history/valuation", "/events/2015-stripe-atlas"]) {
      expect(isFilePath(path)).toBe(false);
    }
  });

  test("the router takes the site's pages, and its files get plain links", () => {
    const html = renderToStaticMarkup(
      <EditorialParagraph
        parts={[
          { href: `${SITE_ORIGIN}/about`, text: "About" },
          { href: `${SITE_ORIGIN}/history/acquisitions.yml`, text: "the acquisitions data" },
          { href: `${SITE_ORIGIN}/llms.txt`, text: "llms.txt" },
        ]}
      />,
    );
    // A router link carries the app path, and the router adds the base path itself.
    expect(html).toContain('href="/about"');
    expect(html).toContain(`href="${SITE_ORIGIN}/history/acquisitions.yml"`);
    expect(html).toContain(`href="${SITE_ORIGIN}/llms.txt"`);
  });
});
