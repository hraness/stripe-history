import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AboutPage, { metadata } from "./page";

describe("stripehistory.com about page", () => {
  test("publishes a canonical editorial and privacy explanation", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(metadata).toMatchObject({
      alternates: { canonical: "/about" },
      title: "About",
    });
    expect(html).toContain("<h1 id=\"about-heading\">About stripehistory.com</h1>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain("anonymous, cookieless product analytics");
    expect(html).toContain("diagnose bounded software errors");
    expect(html).toContain("exclude query strings, form input, identity");
    expect(html).toContain("timeline and its focused category views stay aligned");
    expect(html).toContain('href="https://hraness.com/"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).not.toContain("Atom feed");
    expect(html).not.toContain("news summaries");
    expect(html).toContain('type="application/ld+json"');
  });
});
