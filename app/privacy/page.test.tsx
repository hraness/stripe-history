import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage, { metadata } from "./page";

function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gu, " ").replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

describe("hraness.com/stripe privacy page", () => {
  test("publishes the analytics and general Hraness newsletter policy at /privacy", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/privacy" },
      title: "Privacy",
    });
    expect(html).toContain('<h1 id="privacy-heading">Privacy</h1>');
    expect(html).toContain("anonymous, cookieless pageview events for public pages");
    expect(html).toContain("does not save an analytics cookie or identifier");
    expect(html).toContain("no local reader accounts or authentication");
    expect(html).toContain('href="https://account.hraness.com"');
    expect(html).toContain("the general Hraness newsletter");
    expect(html).toContain("anonymous form presentation and measurement");
    expect(html).toContain("omit account credentials and do not send your email address");
    expect(html).toContain("Accounts records dated consent");
    expect(html).toContain("You are not subscribed until you confirm");
    expect(html).toContain("does not create new Stripe History mailing consent");
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
