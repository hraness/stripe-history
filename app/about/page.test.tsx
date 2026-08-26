import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AboutPage, { metadata } from "./page";

describe("hraness.com/stripe about page", () => {
  test("publishes a canonical editorial and privacy explanation", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/about" },
      title: "About",
    });
    expect(html).toContain("<h1 id=\"about-heading\">About hraness.com/stripe</h1>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain("anonymous, cookieless pageview events for public pages");
    expect(html).toContain("normalized public page path, its page category, a site identifier");
    expect(html).toContain("referrer properties, account data, and user content");
    expect(html).toContain("does not save an analytics cookie or identifier");
    expect(html).toContain("does not use autocapture, session replay, heatmaps, surveys");
    expect(html).toContain("no user accounts or authentication");
    expect(html).toContain("ordinary logs and security controls of the hosting provider");
    expect(html).toContain("founder side projects and aesthetics programs");
    expect(html).toContain("timeline and its focused category views stay aligned");
    expect(html).toContain('aria-current="page" href="/about">about</a>');
    expect(html).toContain('aria-label="Appearance: System"');
    expect(html).toContain('href="https://hraness.com/"');
    expect(html).toContain('href="https://github.com/hraness/stripedex"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain("Atom feed");
    expect(html).not.toContain("news summaries");
    expect(html).toContain('type="application/ld+json"');
  });
});
