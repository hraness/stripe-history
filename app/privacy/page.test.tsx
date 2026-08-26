import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage, { metadata } from "./page";

function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gu, " ").replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

describe("hraness.com/stripe privacy page", () => {
  test("publishes the existing analytics policy at /privacy", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/privacy" },
      title: "Privacy",
    });
    expect(html).toContain('<h1 id="privacy-heading">Privacy</h1>');
    expect(html).toContain("anonymous, cookieless pageview events for public pages");
    expect(html).toContain("does not save an analytics cookie or identifier");
    expect(html).toContain("no user accounts or authentication");
    expect(html).toContain('href="/contact"');
    expect(html).toContain('aria-label="Appearance: System"');
    expect(visibleText(html).length).toBeGreaterThan(500);
  });
});
