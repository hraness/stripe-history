import { describe, expect, test } from "bun:test";
import { timelineCategoryIds } from "@/lib/history-schema";
import type { CaptureResult } from "posthog-js";

import {
  canonicalAnalyticsUrl,
  classifyPublicAnalyticsRoute,
  DIRECT_REFERRER,
  MAX_REFERRER_HOST_LENGTH,
  POSTHOG_COOKILESS_DISTINCT_ID,
  PUBLIC_ANALYTICS_PATHS,
  referrerHost,
} from "./analytics";
import {
  createPostHogBeforeSend,
  createPostHogConfig,
  isPostHogEligible,
} from "./posthog";
import { publicSitePath, type SitePath } from "./site";

function pageview(properties: CaptureResult["properties"]): CaptureResult {
  return {
    event: "$pageview",
    properties: {
      $raw_user_agent: "PostHog test browser",
      ...properties,
    },
    uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
  };
}

describe("Stripe History analytics routes", () => {
  test("classifies every rendered public route from a finite allowlist", () => {
    const expectedCategoryPaths = timelineCategoryIds.map(
      (category) => `/history/${category}`,
    );
    expect(JSON.stringify(PUBLIC_ANALYTICS_PATHS)).toBe(JSON.stringify([
      "/",
      "/about",
      "/contact",
      "/privacy",
      "/data",
      "/history/payment-volume",
      "/history/net-revenue",
      "/history/valuation",
      ...expectedCategoryPaths,
    ]));

    for (const path of PUBLIC_ANALYTICS_PATHS) {
      const canonicalPath = publicSitePath(path as SitePath);
      expect(classifyPublicAnalyticsRoute(`https://hraness.com${canonicalPath}`))
        .toMatchObject({ canonical_path: canonicalPath, site_id: "stripe-history" });
    }
  });

  test("removes query, fragment, and trailing-slash detail from approved pages", () => {
    const route = classifyPublicAnalyticsRoute(
      "https://hraness.com/stripe/history/acquisitions/?account=private#person",
    );
    expect(route).toEqual({
      analytics_schema_version: 1,
      canonical_domain: "hraness.com",
      canonical_path: "/stripe/history/acquisitions",
      page_kind: "history_category",
      site_id: "stripe-history",
    });
    expect(route === null ? null : canonicalAnalyticsUrl(route))
      .toBe("https://hraness.com/stripe/history/acquisitions");
  });

  test("rejects noncanonical hosts, protocols, and unknown paths", () => {
    expect(classifyPublicAnalyticsRoute("https://example.com/stripe/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("http://hraness.com/stripe/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("https://hraness.com:444/stripe/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("https://hraness.com/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("https://hraness.com/stripe/history/private-account"))
      .toBeNull();
    expect(classifyPublicAnalyticsRoute("https://hraness.com/stripe/research/private"))
      .toBeNull();
  });
});

describe("Stripe History PostHog boundary", () => {
  const evidence = {
    href: "https://hraness.com/stripe/about?email=reader@example.com#account",
    production: true,
  } as const;

  test("requires production, the canonical route, and a public project key", () => {
    expect(isPostHogEligible({ apiKey: "phc_publicproject", evidence })).toBe(true);
    expect(isPostHogEligible({ evidence })).toBe(false);
    expect(isPostHogEligible({ apiKey: "phx_privatevalue", evidence })).toBe(false);
    expect(isPostHogEligible({
      apiKey: "phc_publicproject",
      evidence: { ...evidence, production: false },
    })).toBe(false);
    expect(isPostHogEligible({
      apiKey: "phc_publicproject",
      evidence: { ...evidence, href: "https://preview.vercel.app/about" },
    })).toBe(false);
    expect(isPostHogEligible({
      apiHost: "https://example.com",
      apiKey: "phc_publicproject",
      evidence,
    })).toBe(false);
  });

  test("disables every PostHog surface except cookieless pageviews", () => {
    expect(createPostHogConfig(() => evidence.href, () => "")).toMatchObject({
      advanced_disable_feature_flags: true,
      advanced_disable_flags: true,
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_pageleave: false,
      capture_pageview: "history_change",
      capture_performance: false,
      cookieless_mode: "always",
      disable_conversations: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "never",
      persistence: "memory",
      rageclick: false,
      request_batching: false,
      save_campaign_params: false,
      save_referrer: false,
    });
  });

  test("the capture boundary follows consent changes without retaining the previous decision", () => {
    let allowed = false;
    const beforeSend = createPostHogConfig(() => evidence.href, () => "", undefined, () => allowed).before_send;
    if (typeof beforeSend !== "function") throw new Error("Expected one capture boundary");
    const capture = pageview({
      $cookieless_mode: true,
      distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
      token: "phc_publicproject",
      email: "reader@example.com",
    });
    expect(beforeSend(capture)).toBeNull();
    allowed = true;
    expect(beforeSend(capture)?.properties.$current_url).toBe("https://hraness.com/stripe/about");
    expect(beforeSend(capture)?.properties.email).toBeUndefined();
    allowed = false;
    expect(beforeSend(capture)).toBeNull();
  });

  test("before-send emits only an anonymous, canonical pageview", () => {
    const beforeSend = createPostHogBeforeSend(
      () => evidence.href,
      () => "https://Example.com:8443/account/private?token=secret#frag",
    );
    const result = beforeSend(pageview({
      $cookieless_mode: true,
      $current_url: evidence.href,
      $device_id: "private-device",
      $referrer: "https://example.com/account/private",
      account_id: "private-account",
      distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
      email: "reader@example.com",
      token: "phc_publicproject",
      utm_campaign: "private-campaign",
    }));

    expect(result?.properties).toEqual({
      $cookieless_mode: true,
      $current_url: "https://hraness.com/stripe/about",
      $host: "hraness.com",
      $pathname: "/stripe/about",
      $process_person_profile: false,
      $raw_user_agent: "PostHog test browser",
      $referring_domain: "example.com",
      analytics_schema_version: 1,
      canonical_domain: "hraness.com",
      canonical_path: "/stripe/about",
      distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
      page_kind: "about",
      site_id: "stripe-history",
      token: "phc_publicproject",
    });
    expect(JSON.stringify(result)).not.toContain("reader@example.com");
    expect(JSON.stringify(result)).not.toContain("private-account");
    expect(JSON.stringify(result)).not.toContain("$referrer");
    expect(JSON.stringify(result)).not.toContain("account/private");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("8443");
  });

  test("before-send rejects every other event and identity mode", () => {
    const beforeSend = createPostHogBeforeSend(() => evidence.href, () => "");
    const validProperties = {
      $cookieless_mode: true,
      distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
      token: "phc_publicproject",
    };
    expect(beforeSend({
      event: "$pageleave",
      properties: validProperties,
      uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
    })).toBeNull();
    expect(beforeSend(pageview({ ...validProperties, distinct_id: "account-123" })))
      .toBeNull();
    expect(beforeSend(pageview({ ...validProperties, $cookieless_mode: false })))
      .toBeNull();
    expect(beforeSend(pageview({ ...validProperties, $raw_user_agent: "" })))
      .toBeNull();
    expect(beforeSend(pageview({
      ...validProperties,
      $raw_user_agent: "x".repeat(1_001),
    }))?.properties.$raw_user_agent).toBe("x".repeat(1_000));
    expect(createPostHogBeforeSend(
      () => "https://hraness.com/stripe/history/private-account",
      () => "",
    )(pageview(validProperties))).toBeNull();
  });
});

describe("referrer host", () => {
  test("keeps only the host name of an http(s) referrer", () => {
    expect(referrerHost("https://www.Google.com/search?q=stripe")).toBe("www.google.com");
    expect(referrerHost("http://news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
    expect(referrerHost("https://user:pass@example.org:8080/a#b")).toBe("example.org");
  });

  test("marks an empty referrer as a direct visit", () => {
    expect(referrerHost("")).toBe(DIRECT_REFERRER);
    expect(referrerHost(undefined)).toBe(DIRECT_REFERRER);
  });

  test("drops referrers that are not ordinary web host names", () => {
    expect(referrerHost("android-app://com.google.android.gm/")).toBeNull();
    expect(referrerHost("file:///Users/reader/notes.html")).toBeNull();
    expect(referrerHost("https://[::1]/")).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
    expect(referrerHost(42)).toBeNull();
    expect(referrerHost(`https://${"a".repeat(3_000)}.com/`)).toBeNull();
  });

  test("accepts a host at the byte ceiling and rejects one past it", () => {
    const label = "a".repeat(63);
    const atCeiling = `${label}.${label}.${label}.${"b".repeat(61)}`;
    expect(atCeiling.length).toBe(MAX_REFERRER_HOST_LENGTH);
    expect(referrerHost(`https://${atCeiling}/`)).toBe(atCeiling);
    expect(referrerHost(`https://${atCeiling}c/`)).toBeNull();
  });
});
