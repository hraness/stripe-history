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
      title: "Contact",
    });
    expect(html).toContain("<h1 id=\"contact-heading\">Contact hraness.com/stripe</h1>");
    expect(html).toContain("https://github.com/hraness/stripe-history/issues");
    expect(html).toContain("private vulnerability reporting");
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain("There is no reader account, contact form, or product inbox");
    expect(html).not.toContain("mailto:");
    expect(html).toContain('aria-label="Appearance: System"');
    expect(visibleText(html).length).toBeGreaterThan(500);
  });
});
