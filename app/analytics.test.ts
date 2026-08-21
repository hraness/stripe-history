import { describe, expect, test } from "bun:test";
import { timelineCategoryIds } from "@/lib/history-schema";
import type { CaptureResult } from "posthog-js";

import {
  canonicalAnalyticsUrl,
  classifyPublicAnalyticsRoute,
  POSTHOG_COOKILESS_DISTINCT_ID,
  PUBLIC_ANALYTICS_PATHS,
} from "./analytics";
import {
  createPostHogBeforeSend,
  createPostHogConfig,
  isPostHogEligible,
} from "./posthog";

function pageview(properties: CaptureResult["properties"]): CaptureResult {
  return {
    event: "$pageview",
    properties,
    uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
  };
}

describe("Stripedex analytics routes", () => {
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
      "/history/valuation",
      ...expectedCategoryPaths,
    ]));

    for (const path of PUBLIC_ANALYTICS_PATHS) {
      expect(classifyPublicAnalyticsRoute(`https://stripedex.com${path}`))
        .toMatchObject({ canonical_path: path, site_id: "stripedex" });
    }
  });

  test("removes query, fragment, and trailing-slash detail from approved pages", () => {
    const route = classifyPublicAnalyticsRoute(
      "https://stripedex.com/history/acquisitions/?account=private#person",
    );
    expect(route).toEqual({
      analytics_schema_version: 1,
      canonical_domain: "stripedex.com",
      canonical_path: "/history/acquisitions",
      page_kind: "history_category",
      site_id: "stripedex",
    });
    expect(route === null ? null : canonicalAnalyticsUrl(route))
      .toBe("https://stripedex.com/history/acquisitions");
  });

  test("rejects noncanonical hosts, protocols, and unknown paths", () => {
    expect(classifyPublicAnalyticsRoute("https://www.stripedex.com/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("http://stripedex.com/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("https://stripedex.com:444/about")).toBeNull();
    expect(classifyPublicAnalyticsRoute("https://stripedex.com/history/private-account"))
      .toBeNull();
    expect(classifyPublicAnalyticsRoute("https://stripedex.com/research/private"))
      .toBeNull();
  });
});

describe("Stripedex PostHog boundary", () => {
  const evidence = {
    href: "https://stripedex.com/about?email=reader@example.com#account",
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
    expect(createPostHogConfig(() => evidence.href)).toMatchObject({
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
      save_campaign_params: false,
      save_referrer: false,
    });
  });

  test("before-send emits only an anonymous, canonical pageview", () => {
    const beforeSend = createPostHogBeforeSend(() => evidence.href);
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
      $current_url: "https://stripedex.com/about",
      $host: "stripedex.com",
      $pathname: "/about",
      $process_person_profile: false,
      analytics_schema_version: 1,
      canonical_domain: "stripedex.com",
      canonical_path: "/about",
      distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
      page_kind: "about",
      site_id: "stripedex",
      token: "phc_publicproject",
    });
    expect(JSON.stringify(result)).not.toContain("reader@example.com");
    expect(JSON.stringify(result)).not.toContain("private-account");
    expect(JSON.stringify(result)).not.toContain("referrer");
  });

  test("before-send rejects every other event and identity mode", () => {
    const beforeSend = createPostHogBeforeSend(() => evidence.href);
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
    expect(createPostHogBeforeSend(
      () => "https://stripedex.com/history/private-account",
    )(pageview(validProperties))).toBeNull();
  });
});
