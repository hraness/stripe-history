import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SiteFooter } from "./site-footer";

test("renders one minimal footer: own links, the HRANESS wordmark, the independence note and consent", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  expect(html.match(/<footer\b/gu)).toHaveLength(1);
  expect(html).toContain('id="stripe-history-footer"');
  expect(html).toContain('aria-label="Stripe History links"');
  for (const href of ["/stripe/data", "/stripe/about", "/stripe/contact", "/stripe/privacy", "/stripe/privacy#choices", "https://github.com/hraness/stripe-history"]) {
    expect(html).toContain(`href="${href}"`);
  }
  expect(html).toContain(">Your Privacy Choices</a>");
  expect(html).toMatch(/<a class="stripe-history-footer__wordmark [^"]+" data-analytics-cta="footer-hraness" href="https:\/\/hraness\.com\/?">Hraness<\/a>/u);
  expect(html).toContain("is not affiliated with, endorsed by, or operated by Stripe, Inc.");
  // The shared consent note keeps its own region check and preference control.
  expect(html).toContain("hraness-cookie-consent");
  // No mailing list, support handoff, social icons, avatar or help chip.
  expect(html).not.toContain("<form");
  expect(html).not.toContain("account.hraness.com/support");
  expect(html).not.toContain('data-slot="social-icon"');
  expect(html).not.toContain('data-slot="hraness-site-footer"');
  expect(html).not.toContain("<img");
});

test("removes the obsolete Stripe History Turnstile configuration", async () => {
  const [environmentExample, workflow] = await Promise.all([
    Bun.file(new URL("../.env.example", import.meta.url)).text(),
    Bun.file(new URL("../.github/workflows/ci.yml", import.meta.url)).text(),
  ]);

  expect(environmentExample).not.toContain(
    "NEXT_PUBLIC_HRANESS_MAILING_TURNSTILE_SITEKEY",
  );
  expect(workflow).not.toContain(
    "NEXT_PUBLIC_HRANESS_MAILING_TURNSTILE_SITEKEY",
  );
});
