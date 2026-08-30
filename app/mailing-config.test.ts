import { describe, expect, test } from "bun:test";
import { HranessSiteFooter } from "@hraness/site-footer/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV,
  stripeHistoryMailingListConfig,
} from "./mailing-config";

describe("Stripe History mailing configuration", () => {
  test("binds the public widget key to only the Stripe History audience", () => {
    const turnstileSitekey = "1x00000000000000000000AA";
    const mailingList = stripeHistoryMailingListConfig({
      [STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV]: turnstileSitekey,
    });
    expect(mailingList).toEqual({
      audience: "stripe-history",
      kind: "signup",
      turnstileSitekey,
    });

    const html = renderToStaticMarkup(createElement(HranessSiteFooter, {
      mailingList,
    }));
    expect(html).toContain(
      'action="https://account.hraness.com/api/mailing/subscribe"',
    );
    expect(html).toContain(
      'name="audience" type="hidden" value="stripe-history"',
    );
    expect(html).toContain('data-action="mailing_stripe_history"');
    expect(html).toContain('aria-label="Hraness on X"');
    expect(html).toContain('aria-label="Hraness on GitHub"');
    expect(html).not.toContain(
      'name="audience" type="hidden" value="hraness"',
    );
    expect(html).not.toContain("hraness.substack.com");
  });

  test("fails closed on missing or malformed public widget keys", () => {
    for (const turnstileSitekey of [
      undefined,
      "too-short",
      "1x00000000000000000000AA!",
    ]) {
      expect(() => stripeHistoryMailingListConfig({
        [STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV]: turnstileSitekey,
      })).toThrow(STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV);
    }
  });

  test("declares the public key for local setup and deterministic CI", async () => {
    const [environmentExample, workflow] = await Promise.all([
      Bun.file(new URL("../.env.example", import.meta.url)).text(),
      Bun.file(new URL("../.github/workflows/ci.yml", import.meta.url)).text(),
    ]);

    expect(environmentExample).toContain(
      `${STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV}=`,
    );
    expect(workflow).toContain(
      `${STRIPE_HISTORY_MAILING_TURNSTILE_SITEKEY_ENV}: 1x00000000000000000000AA`,
    );
  });
});
