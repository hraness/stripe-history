import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import ContactPage, { metadata } from "./page";

function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gu, " ").replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

describe("hraness.com/stripe contact page", () => {
  test("lists the existing public correction and security channels", () => {
    const html = renderToStaticMarkup(<ContactPage />);
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/contact" },
      title: { absolute: "Contact Stripe History: corrections and sources" },
    });
    expect(html).toContain("<h1 id=\"contact-heading\">Contact Stripe History</h1>");
    expect(html).toContain('<h2 id="corrections-and-sources">Corrections and sources</h2>');
    expect(html).toContain("https://github.com/hraness/stripe-history/issues");
    expect(html).toContain("private vulnerability reporting");
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain('href="https://github.com/hraness/stripe-history/security/advisories/new"');
    expect(html).not.toContain("mailto:");
    expect(html).toContain('aria-label="Appearance: System"');
    expect(visibleText(html)).toContain("historical mailing consent");
  });
});
