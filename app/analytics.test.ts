import { describe, expect, test } from "bun:test";
import { regionPolicy } from "@hraness/analytics/policy";

import {
  analyticsConfig,
  CONSENT_WORDS,
  isProductEvent,
  PRODUCT_EVENTS,
  stripeHistoryPageKind,
} from "./analytics";

describe("Stripe History analytics configuration", () => {
  test("matches hraness.com so one consent answer and cookie cover the host", () => {
    const config = analyticsConfig("/stripe");
    expect(config).toMatchObject({
      token: "phc_xqEpQgmKxZDYda3DvForfnKDuVL6urqD2YTtqDPmUL4u",
      apiHost: "/ph",
      regionUrl: "/api/region",
      hosts: ["hraness.com"],
      siteId: "stripe-history",
      storagePrefix: "hraness",
      preset: "marketing",
      pageKind: "history_timeline",
      privacyHref: "/stripe/privacy",
    });
    expect(config.onAds).toBeUndefined();
    expect(config.words).toEqual(CONSENT_WORDS);
  });

  test("names every public page kind", () => {
    expect(stripeHistoryPageKind("/stripe")).toBe("history_timeline");
    expect(stripeHistoryPageKind("/stripe/")).toBe("history_timeline");
    expect(stripeHistoryPageKind("/stripe/events/stripe-launches-atlas")).toBe("history_event");
    expect(stripeHistoryPageKind("/stripe/history/acquisitions")).toBe("history_category");
    expect(stripeHistoryPageKind("/stripe/history/valuation")).toBe("valuation");
    expect(stripeHistoryPageKind("/stripe/history/payment-volume")).toBe("payment_volume");
    expect(stripeHistoryPageKind("/stripe/history/net-revenue")).toBe("net_revenue");
    expect(stripeHistoryPageKind("/stripe/privacy")).toBe("privacy");
    expect(stripeHistoryPageKind("/stripe/data")).toBe("data_index");
    expect(stripeHistoryPageKind("/stripe/nope/deeper")).toBe("other");
  });

  test("accepts only the checked product events", () => {
    for (const name of PRODUCT_EVENTS) expect(isProductEvent(name)).toBe(true);
    expect(isProductEvent("checkout completed")).toBe(false);
    expect(isProductEvent(undefined)).toBe(false);
  });

  test("the shared region table gives the rules the privacy page describes", () => {
    const eu = regionPolicy({ country: "DE", zone: "Europe/Berlin", gpc: false, choices: {} });
    expect(eu.analytics).toBe("cookieless");
    expect(eu.replay).toBe(false);
    const uk = regionPolicy({ country: "GB", zone: "Europe/London", gpc: false, choices: {} });
    expect(uk.analytics).toBe("persistent");
    expect(uk.replay).toBe(false);
    const us = regionPolicy({ country: "US", zone: "America/Chicago", gpc: false, choices: {} });
    expect(us.analytics).toBe("persistent");
    expect(us.replay).toBe(true);
    const gpc = regionPolicy({ country: "US", zone: "America/Chicago", gpc: true, choices: {} });
    expect(gpc.analytics).toBe("persistent");
    expect(gpc.replay).toBe(false);
    expect(gpc.ads).toBe(false);
  });
});
