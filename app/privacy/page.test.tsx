import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage, { metadata } from "./page";

function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gu, " ").replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

describe("hraness.com/stripe privacy page", () => {
  test("publishes the analytics and historical mailing consent policy at /privacy", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/privacy" },
      title: { absolute: "Stripe History privacy: analytics and data handling" },
    });
    expect(html).toContain('<h1 id="privacy-heading">Privacy</h1>');
    expect(html).toContain('<h2 id="choices">Your Privacy Choices</h2>');
    expect(html).toContain('href="https://hraness.com/stripe/privacy?ads=off#choices"');
    expect(html).toContain('href="https://hraness.com/stripe/privacy?analytics=off#choices"');
    expect(html).toContain('href="https://hraness.com/stripe/privacy?analytics=on#choices"');
    expect(html).toContain('href="https://hraness.com/stripe/privacy?ads=on#choices"');
    for (const fact of ["hraness-id", "hraness-choice", "13 months", "Global Privacy Control", "Do Not Track", "European Union", "United Kingdom, Switzerland, and Brazil", "seven years", "30 days", "every input is masked"]) {
      expect(html).toContain(fact);
    }
    expect(html).toContain("does not run ads or advertising pixels");
    expect(html).not.toContain("the general Hraness newsletter");
    expect(html).not.toContain("anonymous form presentation and measurement");
    expect(html).toContain("Stripe History no longer offers a mailing signup");
    expect(html).toContain("previously confirmed membership");
    expect(html).toContain("newsletter messages through Resend");
    expect(html).toContain("news.hraness.com");
    expect(html).toContain("Stripe-History-specific unsubscribe link");
    expect(html).toContain("does not delete, cancel, or migrate that record");
    expect(html).not.toContain("Cloudflare Turnstile");
    expect(html).toContain('href="/contact"');
    expect(html).toContain('aria-label="Appearance: System"');
    expect(visibleText(html).length).toBeGreaterThan(500);
  });
});
