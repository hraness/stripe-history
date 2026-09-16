import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SiteFooter } from "./site-footer";

const sharedLinkOrder = [
  "https://substack.com/@hraness",
  "https://x.com/hraness",
  "https://www.linkedin.com/company/hraness",
  "https://github.com/hraness",
] as const;

test("keeps Stripe History resources above the canonical Hraness footer", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  expect(html.match(/<footer\b/gu)).toHaveLength(1);
  expect(html.match(/data-slot="social-icon"/gu)).toHaveLength(4);
  expect(html).not.toContain("hraness-site-footer__wordmark");
  expect(html).not.toContain('aria-label="Ask AI about this"');
  expect(html).toContain('aside aria-label="Stripe History resources"');
  expect(html).toContain('href="/stripe/data"');
  expect(html).toContain('href="/stripe/about"');
  expect(html).toContain('href="/stripe/contact"');
  expect(html).toContain('href="/stripe/privacy"');
  expect(html).toContain('href="https://github.com/hraness/stripe-history"');
  expect(html).not.toContain("hraness.substack.com/embed");
  expect(html.match(/<form\b/gu)).toHaveLength(1);
  expect(html).toContain('action="https://account.hraness.com/api/mailing/subscribe"');
  expect(html).toContain('name="audience" type="hidden" value="hraness"');
  expect(html).toContain("https://account.hraness.com/support?product=hraness&amp;source=web#support");
  expect(html).not.toContain('value="stripe-history"');
  expect(html).not.toContain("cf-turnstile");
  expect(html.indexOf('aria-label="Stripe History resources"')).toBeLessThan(
    html.indexOf('data-slot="hraness-site-footer"'),
  );

  let previousLinkIndex = -1;
  for (const href of sharedLinkOrder) {
    const linkIndex = html.indexOf(`href="${href}"`);
    expect(linkIndex).toBeGreaterThan(previousLinkIndex);
    previousLinkIndex = linkIndex;
  }
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
