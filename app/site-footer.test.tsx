import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SiteFooter } from "./site-footer";

const sharedLinkOrder = [
  "https://substack.com/@hraness",
  "https://x.com/hraness",
  "https://www.instagram.com/hraness/",
  "https://www.linkedin.com/in/hraness",
  "https://bsky.app/profile/hraness.bsky.social",
  "https://www.threads.com/@hraness",
  "https://github.com/hraness",
  "https://www.tiktok.com/@hraness",
  "https://www.reddit.com/user/bgdotjpg/",
  "https://www.twitch.tv/hranessdotcom",
  "https://www.youtube.com/@hraness",
] as const;

test("keeps Stripe History resources above the canonical Hraness footer", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  expect(html.match(/<footer\b/gu)).toHaveLength(1);
  expect(html).not.toContain('aria-label="Ask AI about this"');
  expect(html).toContain('aside aria-label="Stripe History resources"');
  expect(html).toContain('href="/stripe/data"');
  expect(html).toContain('href="/stripe/about"');
  expect(html).toContain('href="/stripe/contact"');
  expect(html).toContain('href="/stripe/privacy"');
  expect(html).toContain('href="https://github.com/hraness/stripe-history"');
  expect(html).toContain(
    '<iframe class="stripe-history-substack__embed" frameBorder="0" height="150" scrolling="no" src="https://hraness.substack.com/embed" title="subscribe to hraness on substack" width="480"></iframe>',
  );
  expect(html).toContain('aria-label="Subscribe to Hraness"');
  expect(html).not.toContain("account.hraness.com/api/mailing/subscribe");
  expect(html).not.toContain('name="audience"');
  expect(html).not.toContain("cf-turnstile");
  expect(html).not.toContain(
    'name="audience" type="hidden" value="hraness"',
  );
  expect(html.indexOf('aria-label="Stripe History resources"')).toBeLessThan(
    html.indexOf('aria-label="Subscribe to Hraness"'),
  );
  expect(html.indexOf('aria-label="Subscribe to Hraness"')).toBeLessThan(
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
