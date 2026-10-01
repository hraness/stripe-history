import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { timelineCategoryIds } from "@/lib/history-schema";
import type { CaptureResult } from "posthog-js";

import { ExceptionBudget, isStandardAnalyticsEventName } from "@hraness/posthog/event";
import type { PostHogSiteDefinition } from "@hraness/posthog/site";
import type { HarnessInput, HarnessScenario } from "../scripts/analytics-posthog-harness";
import {
  analyticsSite,
  classifyStripeHistoryRoute,
  PUBLIC_ANALYTICS_PATHS,
} from "./analytics";
import {
  ALLOWED_ANALYTICS_EVENTS,
  analyticsExceptionCapture,
  createPostHogBeforeSend,
  createPostHogConfig,
  EXCEPTION_BUDGET,
  isPostHogEligible,
} from "./posthog";
import { publicSitePath, type SitePath } from "./site";

const API_KEY = "phc_harnessContractToken000000000000000000";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const LEAK_EMAIL = "person.contract@example.com";
const LEAK_CODE = "oauthcontractcode123";
const LEAK_STATE = "oauthcontractstate456";
const LEAK_PARAM = "private_contract_param";
const THIRD_PARTY_REFERRER = "https://news.example.org/some/article/path?ref=contract#top";

type SentEvent = Readonly<{
  event: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}>;

function decodeBody(base64: string): SentEvent[] {
  let bytes: Uint8Array = Buffer.from(base64, "base64");
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
  let text = new TextDecoder().decode(bytes);
  if (text.startsWith("data=")) {
    text = Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8");
  }
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed as SentEvent[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { batch?: unknown }).batch)) {
    return (parsed as { batch: SentEvent[] }).batch;
  }
  return [parsed as SentEvent];
}

/** Runs real, pinned posthog-js with the production config in a child process. */
function runHarness(
  scenarios: readonly HarnessScenario[],
  site?: PostHogSiteDefinition,
): Readonly<{ sent: SentEvent[]; returned: unknown[] }> {
  const input: HarnessInput = {
    apiKey: API_KEY,
    userAgent: USER_AGENT,
    scenarios,
    ...(site ? { site } : {}),
  };
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/analytics-posthog-harness.ts", import.meta.url))],
    { encoding: "utf8", input: JSON.stringify(input), maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
  );
  if (child.status !== 0) {
    throw new Error(`analytics harness exited ${child.status ?? child.signal}\n${child.stderr}`);
  }
  const output = JSON.parse(child.stdout) as { sent: string[]; returned: unknown[] };
  return { sent: output.sent.flatMap(decodeBody), returned: output.returned };
}

function property(event: SentEvent, key: string): unknown {
  return event.properties[key] ?? (key === "distinct_id" ? event["distinct_id"] : undefined);
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
      const route = classifyStripeHistoryRoute(`https://hraness.com${canonicalPath}`);
      expect(route).toMatchObject({
        analytics_schema_version: 2,
        canonical_domain: "hraness.com",
        canonical_path: canonicalPath,
        site_id: "stripe-history",
      });
      expect(route?.page_kind).not.toBe("not_found");
    }
  });

  test("removes query, fragment, trailing slash, and www from approved pages", () => {
    expect(classifyStripeHistoryRoute(
      "https://www.hraness.com/stripe/history/acquisitions/?account=private#person",
    )).toEqual({
      analytics_schema_version: 2,
      canonical_domain: "hraness.com",
      canonical_path: "/stripe/history/acquisitions",
      page_kind: "history_category",
      site_id: "stripe-history",
    });
  });

  test("marks unknown paths under /stripe as the 404 page", () => {
    expect(classifyStripeHistoryRoute("https://hraness.com/stripe/history/missing"))
      .toMatchObject({ canonical_path: "/stripe/history/missing", page_kind: "not_found" });
  });

  test("rejects other hosts and paths outside /stripe", () => {
    expect(classifyStripeHistoryRoute("https://example.com/stripe/about")).toBeNull();
    expect(classifyStripeHistoryRoute("https://stripe-history.vercel.app/stripe/about")).toBeNull();
    expect(classifyStripeHistoryRoute("https://hraness.com/about")).toBeNull();
    expect(classifyStripeHistoryRoute("https://hraness.com/stripes")).toBeNull();
  });
});

describe("Stripe History PostHog boundary", () => {
  const evidence = {
    href: "https://hraness.com/stripe/about?email=reader@example.com#account",
    production: true,
  } as const;

  test("requires production, a production host, and a public project key", () => {
    expect(isPostHogEligible({ apiKey: "phc_publicproject", evidence })).toBe(true);
    expect(isPostHogEligible({
      apiKey: "phc_publicproject",
      evidence: { ...evidence, href: "https://www.hraness.com/stripe/about" },
    })).toBe(true);
    expect(isPostHogEligible({
      apiKey: "phc_publicproject",
      evidence: { ...evidence, href: "https://hraness.com/stripe/missing-page" },
    })).toBe(true);
    expect(isPostHogEligible({ evidence })).toBe(false);
    expect(isPostHogEligible({ apiKey: "phx_privatevalue", evidence })).toBe(false);
    expect(isPostHogEligible({
      apiKey: "phc_publicproject",
      evidence: { ...evidence, production: false },
    })).toBe(false);
    for (const href of [
      "https://stripe-history-git-branch.vercel.app/stripe/about",
      "https://preview.hraness.com/stripe/about",
      "http://localhost:3000/stripe/about",
      "http://hraness.com/stripe/about",
      "https://hraness.com/about",
    ]) {
      expect(isPostHogEligible({ apiKey: "phc_publicproject", evidence: { ...evidence, href } }))
        .toBe(false);
    }
    expect(isPostHogEligible({
      apiHost: "https://example.com",
      apiKey: "phc_publicproject",
      evidence,
    })).toBe(false);
  });

  test("config is cookieless and turns on pageleave and core web vitals only", () => {
    const config = createPostHogConfig(() => ({ href: evidence.href, referrer: "" }));
    expect(config).toMatchObject({
      advanced_disable_feature_flags: true,
      advanced_disable_flags: true,
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_pageleave: true,
      capture_pageview: "history_change",
      capture_performance: {
        network_timing: false,
        web_vitals: true,
        web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"],
        web_vitals_attribution: false,
      },
      cookieless_mode: "always",
      disable_conversations: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "never",
      persistence: "memory",
      rageclick: false,
    });
    // Preserve the existing referrer-only policy.
    expect(config.request_batching).toBe(false);
    expect(config.save_campaign_params).toBe(false);
    expect(config.save_referrer).toBe(false);
  });

  test("allowlists event names and keeps them in the naming rule", () => {
    expect([...ALLOWED_ANALYTICS_EVENTS].sort()).toEqual([
      "$exception",
      "$pageleave",
      "$pageview",
      "$web_vitals",
      "page not found",
    ]);
    for (const name of [...analyticsSite.customEvents, "page not found"]) {
      expect(isStandardAnalyticsEventName(name)).toBe(true);
    }
    const beforeSend = createPostHogBeforeSend(() => ({ href: evidence.href, referrer: "" }));
    for (const event of ["$autocapture", "$identify", "$feature_flag_called", "$snapshot", "cta clicked"]) {
      expect(beforeSend({
        event,
        properties: { token: API_KEY, $current_url: evidence.href },
        uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
      } as CaptureResult)).toBeNull();
    }
  });

  test("returns null on preview, vercel.app, and localhost hosts", () => {
    for (const host of [
      "preview.hraness.com",
      "stripe-history-git-branch.vercel.app",
      "localhost",
    ]) {
      const href = `https://${host}/stripe/about`;
      const beforeSend = createPostHogBeforeSend(() => ({ href, referrer: "" }));
      expect(beforeSend({
        event: "$pageview",
        properties: { token: API_KEY, $current_url: href, $host: host },
        uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
      } as CaptureResult)).toBeNull();
      // A spoofed $host cannot pass behind a canonical URL.
      expect(beforeSend({
        event: "$pageview",
        properties: { token: API_KEY, $current_url: "https://hraness.com/stripe/about", $host: host },
        uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
      } as CaptureResult)).toBeNull();
    }
  });

  test("removes campaign forms while preserving temporary session markers", () => {
    const beforeSend = createPostHogBeforeSend(() => ({
      href: "https://hraness.com/stripe/about",
      referrer: "",
    }));
    const result = beforeSend({
      event: "$pageview",
      properties: {
        token: API_KEY,
        $current_url: "https://hraness.com/stripe/about?utm_medium=cpc&fbclid=fb1&token=secret#x",
        $host: "hraness.com",
        $cookieless_mode: true,
        distinct_id: "$posthog_cookieless",
        $raw_user_agent: USER_AGENT,
        $session_id: "session-1",
        $window_id: "window-1",
        $pageview_id: "pageview-1",
        $referrer: "$direct",
        $referring_domain: "$direct",
        utm_medium: "cpc",
        fbclid: "fb1",
        $initial_utm_source: "newsletter",
        $initial_gclid: "g1",
        $session_entry_utm_campaign: "spring",
        $session_entry_msclkid: "m1",
        $initial_referrer: "https://news.example.org/a/b?x=1",
        $session_entry_url: `https://hraness.com/stripe/about?utm_campaign=spring&email=${LEAK_EMAIL}`,
        note: `contact ${LEAK_EMAIL} with phx_privatevalue`,
      },
      uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
    } as CaptureResult);
    expect(result?.properties).toMatchObject({
      $session_id: "session-1",
      $window_id: "window-1",
      $pageview_id: "pageview-1",
      $current_url: "https://hraness.com/stripe/about",
      $referrer: "$direct",
      $initial_referrer: "https://news.example.org",
      traffic_channel: "direct",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(LEAK_EMAIL);
    expect(serialized).not.toContain("phx_privatevalue");
    expect(serialized).not.toContain("secret");
  });

  test("budgets exceptions at 20 per minute and 2 per fingerprint", () => {
    const budget = new ExceptionBudget(EXCEPTION_BUDGET);
    const same = new Error("same failure");
    expect(analyticsExceptionCapture(same, "window_error", budget, 0)).not.toBeNull();
    expect(analyticsExceptionCapture(same, "window_error", budget, 1)).not.toBeNull();
    expect(analyticsExceptionCapture(same, "window_error", budget, 2)).toBeNull();
    let accepted = 2;
    for (let index = 0; index < 40; index += 1) {
      if (analyticsExceptionCapture(new Error(`distinct ${index}`), "window_error", budget, 3)) {
        accepted += 1;
      }
    }
    expect(accepted).toBe(20);
    expect(analyticsExceptionCapture(same, "window_error", budget, 60_010)).not.toBeNull();
  });
});

describe("real posthog-js through the production before_send", () => {
  const publicHref = `https://www.hraness.com/stripe/history/acquisitions?utm_source=contract&gclid=contractclick&email=${
    encodeURIComponent(LEAK_EMAIL)
  }&code=${LEAK_CODE}&state=${LEAK_STATE}&${LEAK_PARAM}=1#fragment`;
  const notFoundHref = `https://hraness.com/stripe/missing/${encodeURIComponent(LEAK_EMAIL)}?utm_source=contract&code=${LEAK_CODE}`;
  const leakStack = `TypeError: failed for ${LEAK_EMAIL}\n    at load (https://hraness.com/stripe/_next/static/chunks/app.js?token=phc_secretvalue123:1:2)`;
  // Each scenario is a fresh page load in its own process, as posthog-js keeps
  // the entry referrer for the life of a page.
  const publicRun = runHarness([{
    href: publicHref,
    referrer: THIRD_PARTY_REFERRER,
    captures: [
      { event: "$pageview" },
      { event: "$pageleave" },
      {
        event: "$web_vitals",
        properties: {
          $web_vitals_LCP_value: 1200,
          $web_vitals_LCP_event: { name: "LCP", value: 1200 },
        },
      },
      {
        event: "$exception",
        error: { name: "TypeError", message: `failed for ${LEAK_EMAIL}, +@a.aa, %2B%40a.aa`, stack: leakStack },
        exceptionOrigin: "window_error",
      },
      { event: "$identify", properties: { email: LEAK_EMAIL } },
    ],
  }]);
  const notFoundRun = runHarness([{
    href: notFoundHref,
    referrer: "https://hraness.com/stripe/about?utm_source=inner#section",
    captures: [
      { event: "$pageview" },
      { event: "page not found", pageNotFound: true },
    ],
  }]);
  const directRun = runHarness([{
    href: "https://hraness.com/stripe/about",
    referrer: "",
    captures: [{ event: "$pageview" }],
  }]);
  const sent = [...publicRun.sent, ...notFoundRun.sent, ...directRun.sent];
  const returned = [...publicRun.returned, ...notFoundRun.returned, ...directRun.returned];
  const publicEvents = sent.filter((event) =>
    String(property(event, "$current_url")).includes("/stripe/history/acquisitions"));

  test("sends every standard event and drops the rest", () => {
    expect(publicEvents.map((event) => event.event).sort())
      .toEqual(["$exception", "$pageleave", "$pageview", "$web_vitals"]);
    expect(sent.some((event) => event.event === "$identify")).toBe(false);
    expect(returned.filter((value) => value === null).length).toBeGreaterThanOrEqual(1);
    expect(sent.filter((event) => event.event === "page not found")).toHaveLength(1);
  });

  test("keeps the properties PostHog needs on every event", () => {
    expect(sent.length).toBeGreaterThanOrEqual(7);
    for (const event of sent) {
      for (const key of [
        "$host",
        "$raw_user_agent",
        "$current_url",
        "$pathname",
        "$referrer",
        "$referring_domain",
        "token",
        "site_id",
        "analytics_schema_version",
        "canonical_domain",
        "canonical_path",
        "page_kind",
        "traffic_channel",
        "traffic_source",
        "$cookieless_mode",
        "distinct_id",
      ]) {
        const value = property(event, key);
        expect({ event: event.event, key, present: value !== undefined && value !== null && value !== "" })
          .toEqual({ event: event.event, key, present: true });
      }
      expect(property(event, "$host")).toBe("hraness.com");
      expect(property(event, "$cookieless_mode")).toBe(true);
      expect(property(event, "$process_person_profile")).toBe(false);
      expect(property(event, "site_id")).toBe("stripe-history");
      expect(property(event, "analytics_schema_version")).toBe(2);
      expect(property(event, "canonical_domain")).toBe("hraness.com");
      expect(property(event, "token")).toBe(API_KEY);
    }
    for (const event of sent.filter((candidate) => candidate.event !== "$exception")) {
      expect(typeof property(event, "$pageview_id")).toBe("string");
    }
  });

  test("never strips the session, window, or pageview IDs posthog-js sets", () => {
    const received = runHarness([{
      href: "https://hraness.com/stripe/about",
      referrer: "",
      captures: [{
        event: "$pageview",
        properties: { $session_id: "contract-session", $window_id: "contract-window" },
      }],
    }]).sent;
    expect(received).toHaveLength(1);
    const [event] = received;
    expect(event && property(event, "$session_id")).toBe("contract-session");
    expect(event && property(event, "$window_id")).toBe("contract-window");
  });

  test("drops campaign attribution and reduces third-party referrers to the origin", () => {
    for (const event of publicEvents) {
      const url = new URL(String(property(event, "$current_url")));
      expect(url.origin + url.pathname).toBe("https://hraness.com/stripe/history/acquisitions");
      expect([...url.searchParams.keys()]).toEqual([]);
      expect(url.hash).toBe("");
      expect(property(event, "utm_source")).toBeUndefined();
      expect(property(event, "gclid")).toBeUndefined();
      expect(property(event, "$referrer")).toBe("https://news.example.org");
      expect(property(event, "$referring_domain")).toBe("news.example.org");
      expect(property(event, "referrer_host")).toBe("news.example.org");
      expect(property(event, "page_kind")).toBe("history_category");
      expect(property(event, "canonical_path")).toBe("/stripe/history/acquisitions");
    }
    const pageview = publicEvents.find((event) => event.event === "$pageview");
    expect(pageview && property(pageview, "traffic_channel")).toBe("referral");
  });

  test("reduces own-host referrers to origins and marks direct visits", () => {
    const notFoundPageview = sent.find((event) =>
      event.event === "$pageview" && property(event, "page_kind") === "not_found");
    expect(notFoundPageview && property(notFoundPageview, "$referrer"))
      .toBe("https://hraness.com");
    const direct = sent.find((event) => property(event, "canonical_path") === "/stripe/about");
    expect(direct && property(direct, "$referrer")).toBe("$direct");
    expect(direct && property(direct, "traffic_channel")).toBe("direct");
  });

  test("records 404s with page_kind, a normalized requested path, and the referrer host", () => {
    const notFound = sent.find((event) => event.event === "page not found");
    expect(notFound && property(notFound, "page_kind")).toBe("not_found");
    expect(notFound && property(notFound, "requested_path")).toBe("/stripe/missing/[email]");
    expect(notFound && property(notFound, "referrer_host")).toBe("hraness.com");
    const pageview = sent.find((event) =>
      event.event === "$pageview" && String(property(event, "$current_url")).includes("/missing/"));
    expect(pageview && property(pageview, "page_kind")).toBe("not_found");
  });

  test("labels exceptions and scrubs their messages and stack frames", () => {
    const exception = sent.find((event) => event.event === "$exception");
    expect(exception && property(exception, "error_surface")).toBe("client");
    expect(exception && property(exception, "error_origin")).toBe("window_error");
    expect(String(exception && property(exception, "error_fingerprint"))).toMatch(/^e_[0-9a-f]{8}$/u);
    expect(JSON.stringify(exception)).toContain("[email]");
    expect(JSON.stringify(exception)).not.toContain("phc_secretvalue123");
    expect(JSON.stringify(exception)).not.toContain("+@a.aa");
    expect(JSON.stringify(exception)).not.toContain("%2B%40a.aa");
  });

  test("drops emails, OAuth values, private parameters, fragments, and referrer paths", () => {
    const serialized = JSON.stringify(sent);
    for (const leak of [
      LEAK_EMAIL,
      encodeURIComponent(LEAK_EMAIL),
      LEAK_CODE,
      LEAK_STATE,
      LEAK_PARAM,
      "#fragment",
      "/some/article/path",
      "ref=contract",
      "#section",
      "phc_secretvalue123",
    ]) {
      expect({ leak, found: serialized.includes(leak) }).toEqual({ leak, found: false });
    }
  });

  test("drops the whole query on a sensitive path", () => {
    const site: PostHogSiteDefinition = {
      ...analyticsSite,
      sensitivePaths: [{ match: "prefix", path: "/stripe/contact" }],
    };
    const result = runHarness([{
      href: `https://hraness.com/stripe/contact?utm_source=contract&gclid=contractclick&code=${LEAK_CODE}`,
      referrer: THIRD_PARTY_REFERRER,
      captures: [{ event: "$pageview" }],
    }], site);
    expect(result.sent).toHaveLength(1);
    const [event] = result.sent;
    expect(event && property(event, "$current_url")).toBe("https://hraness.com/stripe/contact");
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("contractclick");
    expect(serialized).not.toContain(LEAK_CODE);
    expect(serialized).not.toContain("\"utm_source\"");
  });
});


describe("consent and live-route safeguards", () => {
  const href = "https://hraness.com/stripe/about";
  const capture = {
    event: "$pageview", uuid: "0198c63c-e6f0-7410-8d2a-31ebd7d39f2e",
    properties: { token: API_KEY, $current_url: href, $host: "hraness.com",
      $cookieless_mode: true, distinct_id: "$posthog_cookieless", $raw_user_agent: USER_AGENT },
  } as CaptureResult;

  test("default-denies and stops sending when consent is revoked", () => {
    let allowed = false;
    const config = createPostHogConfig(() => ({ href, referrer: "" }), undefined, analyticsSite, () => allowed);
    const beforeSend = config.before_send as (event: CaptureResult | null) => CaptureResult | null;
    expect(beforeSend(capture)).toBeNull();
    allowed = true;
    expect(beforeSend(capture)?.event).toBe("$pageview");
    allowed = false;
    expect(beforeSend(capture)).toBeNull();
  });

  test("an initialized client cannot send an old public URL after private navigation", () => {
    let liveHref = href;
    const beforeSend = createPostHogBeforeSend(() => ({ href: liveHref, referrer: "" }));
    expect(beforeSend(capture)).not.toBeNull();
    for (const path of ["/family", "/stripe/auth/callback", "/stripe/%61uth/callback", "/stripe/account", "/stripe/api/private"]) {
      liveHref = `https://hraness.com${path}`;
      expect(beforeSend(capture)).toBeNull();
    }
  });

  test("search referrer keywords and all attribution forms stay private", () => {
    const beforeSend = createPostHogBeforeSend(() => ({ href, referrer: "https://www.google.com/search?q=private-canary" }));
    const event = beforeSend({ ...capture, properties: { ...capture.properties,
      ph_keyword: "private-canary", $initial_ph_keyword: "private-canary", utm_source: "private-canary",
      $initial_utm_source: "private-canary", $session_entry_gclid: "private-canary",
      $initial_referrer: "https://hraness.com/stripe/private-canary?x=private-canary" } });
    expect(event?.properties.$referrer).toBe("https://www.google.com");
    expect(event?.properties.$initial_referrer).toBe("https://hraness.com");
    expect(JSON.stringify(event)).not.toContain("private-canary");
  });

  test("requires cookieless transport markers and enforces its event byte ceiling", () => {
    const beforeSend = createPostHogBeforeSend(() => ({ href, referrer: "" }));
    for (const missing of ["$cookieless_mode", "distinct_id", "$raw_user_agent"]) {
      const properties = { ...capture.properties }; delete properties[missing];
      expect(beforeSend({ ...capture, properties })).toBeNull();
    }
    const properties = { ...capture.properties, ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`diagnostic_${i}`, "x".repeat(2048)])) };
    expect(beforeSend({ ...capture, properties })).toBeNull();
  });
});
