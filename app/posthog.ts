"use client";

import { getBrowserConsent, installConsentTransport } from "@hraness/posthog/consent";
import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";

import {
  analyticsErrorFingerprint,
  ExceptionBudget,
  pageNotFoundProperties,
  sanitizeAnalyticsError,
  sanitizeProviderProperties,
  STANDARD_ANALYTICS_EVENTS,
  redactSensitiveText,
} from "@hraness/posthog/event";
import {
  canonicalAnalyticsUrl,
  isAllowedAnalyticsHost,
  normalizeAnalyticsHostname,
  type PostHogSiteDefinition,
} from "@hraness/posthog/site";
import { classifyAnalyticsTraffic } from "@hraness/posthog/traffic";
import {
  analyticsSite,
  classifyStripeHistoryRoute,
  POSTHOG_API_HOST,
  POSTHOG_COOKILESS_DISTINCT_ID,
} from "./analytics";

const PUBLIC_PROJECT_KEY = /^phc_[A-Za-z0-9_-]{10,}$/u;
const MAX_PENDING_CAPTURES = 8;

/** Events the provider may send. Anything else is dropped in before_send. */
export const ALLOWED_ANALYTICS_EVENTS: ReadonlySet<string> = new Set([
  "$pageview",
  "$pageleave",
  "$web_vitals",
  "$exception",
  STANDARD_ANALYTICS_EVENTS.pageNotFound,
  ...analyticsSite.customEvents,
]);

export type AnalyticsEvidence = Readonly<{
  href: string;
  referrer: string;
}>;

export type AnalyticsRuntimeEvidence = Readonly<{
  href: string;
  production: boolean;
}>;

export type PostHogInitializationOptions = Readonly<{
  apiHost?: string | undefined;
  apiKey?: string | undefined;
  evidence?: AnalyticsRuntimeEvidence | undefined;
}>;

export type ErrorOrigin = "window_error" | "unhandled_rejection" | "react_error_boundary";

let initialization: Promise<boolean> | null = null;
let client: PostHog | null = null;
let pending: ((posthog: PostHog) => void)[] = [];

export const EXCEPTION_BUDGET = {
  totalLimit: 20,
  perFingerprintLimit: 2,
  windowMs: 60_000,
} as const;
const exceptionBudget = new ExceptionBudget(EXCEPTION_BUDGET);
const seenErrors = new WeakSet<object>();

function browserEvidence(): AnalyticsRuntimeEvidence | null {
  if (typeof window === "undefined") return null;
  return {
    href: window.location.href,
    production: process.env.NODE_ENV === "production",
  };
}

function acceptedApiHost(value: string | undefined): string | null {
  const candidate = value ?? POSTHOG_API_HOST;
  return candidate === POSTHOG_API_HOST ? candidate : null;
}

function isProductionPageUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:"
      && url.port === ""
      && url.username === ""
      && url.password === ""
      && isAllowedAnalyticsHost(analyticsSite, url.hostname)
      && classifyStripeHistoryRoute(url) !== null;
  } catch {
    return false;
  }
}

/**
 * Analytics runs only in a production build on hraness.com (or its www alias)
 * under /stripe, with a public project token. Preview deployments,
 * *.vercel.app, and localhost never initialize PostHog.
 */
export function isPostHogEligible(options: PostHogInitializationOptions): boolean {
  const evidence = options.evidence ?? browserEvidence();
  return Boolean(
    evidence?.production
    && options.apiKey !== undefined
    && PUBLIC_PROJECT_KEY.test(options.apiKey)
    && acceptedApiHost(options.apiHost) !== null
    && isProductionPageUrl(evidence.href),
  );
}

/**
 * Uses the released shared sanitizers while retaining the product's public
 * /stripe route boundary, referrer-only policy and cookieless transport contract.
 */
export function createPostHogBeforeSend(
  resolveEvidence: () => AnalyticsEvidence,
  site: PostHogSiteDefinition = analyticsSite,
): (capture: CaptureResult | null) => CaptureResult | null {
  return (capture) => {
    if (!capture || !ALLOWED_ANALYTICS_EVENTS.has(capture.event)) return null;
    if (capture.properties.$cookieless_mode !== true
      || capture.properties.distinct_id !== POSTHOG_COOKILESS_DISTINCT_ID
      || typeof capture.properties.$raw_user_agent !== "string"
      || capture.properties.$raw_user_agent.length === 0) return null;
    const projectToken = capture.properties.token;
    if (typeof projectToken !== "string" || !PUBLIC_PROJECT_KEY.test(projectToken)) {
      return null;
    }
    if (
      typeof capture.properties.$host === "string"
      && !isAllowedAnalyticsHost(site, capture.properties.$host)
    ) {
      return null;
    }
    const evidence = resolveEvidence();
    // Recheck the live page: an initialized SDK can outlive a public route.
    if (!isProductionPageUrl(evidence.href)) return null;
    const rawCurrentUrl = typeof capture.properties.$current_url === "string"
      ? capture.properties.$current_url
      : evidence.href;
    const route = classifyStripeHistoryRoute(rawCurrentUrl, site);
    if (route === null) return null;
    const rawReferrer = typeof capture.properties.$referrer === "string"
      ? capture.properties.$referrer
      : evidence.referrer;
    const traffic = classifyAnalyticsTraffic(site, rawReferrer, rawCurrentUrl);

    const properties = sanitizeProviderProperties(site, {
      ...capture.properties, $referrer: rawReferrer || "$direct",
    }, rawCurrentUrl);
    properties.$referring_domain = traffic.referrer_host || "$direct";
    // The site's published policy retains only referrer origins, including
    // same-host and SDK initial/session forms.
    for (const key of ["$referrer", "$initial_referrer", "$session_entry_referrer", "referrer"]) {
      const value = properties[key];
      if (typeof value !== "string" || value === "$direct") continue;
      try { properties[key] = new URL(value).origin; } catch { delete properties[key]; }
    }
    // The personal-data scrub redacts every `token` value; restore the
    // already-validated public project token that routes the batch.
    properties.token = projectToken;
    const rawHost = typeof capture.properties.$host === "string"
      ? capture.properties.$host
      : new URL(rawCurrentUrl, `https://${site.canonicalDomain}`).hostname;
    properties.$host = normalizeAnalyticsHostname(rawHost).replace(/^www\./u, "");
    properties.$current_url = sanitizeProviderProperties(
      site,
      { $current_url: rawCurrentUrl },
    ).$current_url ?? canonicalAnalyticsUrl(site, route.canonical_path);
    properties.$process_person_profile = false;

    // Unknown (404) paths are visitor-typed, so route values are scrubbed too.
    const scrubbedRoute = Object.fromEntries(
      Object.entries(route).map(([key, value]) => [
        key,
        typeof value === "string" ? redactSensitiveText(value) : value,
      ]),
    );

    const result = {
      uuid: capture.uuid,
      event: capture.event,
      properties: { ...properties, ...scrubbedRoute, ...traffic },
      ...(capture.timestamp === undefined ? {} : { timestamp: capture.timestamp }),
    };
    return new TextEncoder().encode(JSON.stringify(result)).byteLength <= 32_768 ? result : null;
  };
}

export function createPostHogConfig(
  resolveEvidence: () => AnalyticsEvidence,
  apiHost: string = POSTHOG_API_HOST,
  site: PostHogSiteDefinition = analyticsSite,
  captureAllowed: () => boolean = () => getBrowserConsent()?.allowed() ?? false,
): Partial<PostHogConfig> {
  const beforeSend = createPostHogBeforeSend(resolveEvidence, site);
  return {
    api_host: apiHost,
    // Consent transport must recheck each event instead of sending a stale batch.
    request_batching: false,
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    autocapture: false,
    rageclick: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_performance: {
      network_timing: false,
      web_vitals: true,
      web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"],
      web_vitals_attribution: false,
    },
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    enable_recording_console_log: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    // Web vitals come from the bundled extension imported before init; no
    // other feature needs a remote script.
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    person_profiles: "never",
    persistence: "memory",
    cookieless_mode: "always",
    respect_dnt: true,
    cross_subdomain_cookie: false,
    disableDeviceModel: true,
    disable_capture_url_hashes: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    mask_personal_data_properties: true,
    save_campaign_params: false,
    save_referrer: false,
    properties_string_max_length: 2_048,
    internal_or_test_user_hostname: null,
    rate_limiting: { events_per_second: 2, events_burst_limit: 12 },
    before_send: (capture) => captureAllowed()
      ? beforeSend(capture) : null,
  };
}

function flushPending(posthog: PostHog | null): void {
  const queued = pending;
  pending = [];
  if (posthog === null) return;
  for (const run of queued) run(posthog);
}

function whenReady(run: (posthog: PostHog) => void): void {
  if (client !== null) {
    run(client);
  } else if (pending.length < MAX_PENDING_CAPTURES) {
    pending.push(run);
  }
}

export async function initializePostHog(
  options: PostHogInitializationOptions,
): Promise<boolean> {
  if (!isPostHogEligible(options)) {
    flushPending(null);
    return false;
  }

  const consent = getBrowserConsent();
  if (consent === undefined || !consent.allowed()) { flushPending(null); return false; }
  if (initialization !== null) return initialization;
  const apiHost = acceptedApiHost(options.apiHost);
  const apiKey = options.apiKey;
  if (apiHost === null || apiKey === undefined || typeof window === "undefined") {
    flushPending(null);
    return false;
  }

  initialization = Promise.all([
    import("posthog-js"),
    // Registers the web-vitals callbacks from the application bundle so the
    // SDK never injects a remote script.
    import("posthog-js/dist/web-vitals.js"),
  ])
    .then(([{ default: posthog }]) => {
      if (!consent.allowed() || !installConsentTransport(posthog, consent)) {
        initialization = null;
        flushPending(null);
        return false;
      }
      posthog.init(apiKey, createPostHogConfig(
        () => ({ href: window.location.href, referrer: document.referrer }),
        apiHost,
      ));
      client = posthog;
      flushPending(posthog);
      return true;
    })
    .catch(() => {
      initialization = null;
      flushPending(null);
      return false;
    });
  return initialization;
}

/**
 * Sends `page not found` once per call with the normalized requested path
 * (no query, 256 characters max) and the referrer host. Call once per 404
 * render; the event waits for initialization.
 */
export function capturePageNotFound(): void {
  if (typeof window === "undefined" || !(getBrowserConsent()?.allowed() ?? false)) return;
  const properties = pageNotFoundProperties({
    requestedPath: window.location.pathname,
    referrer: document.referrer,
  });
  if (properties === null) return;
  whenReady((posthog) => {
    posthog.capture(STANDARD_ANALYTICS_EVENTS.pageNotFound, properties);
  });
}

export type AnalyticsExceptionCapture = Readonly<{
  error: Error;
  properties: Readonly<Record<string, string>>;
}>;

/**
 * Builds a budgeted `$exception` (20 per minute, 2 per fingerprint): a
 * scrubbed message and stack plus error_surface, error_origin, and
 * error_fingerprint. Returns null once the budget is spent.
 */
export function analyticsExceptionCapture(
  value: unknown,
  origin: ErrorOrigin,
  budget: ExceptionBudget = exceptionBudget,
  now: number = Date.now(),
): AnalyticsExceptionCapture | null {
  const error = sanitizeAnalyticsError(value);
  const fingerprint = analyticsErrorFingerprint(error);
  if (!budget.allow(fingerprint, now)) return null;
  return {
    error,
    properties: {
      error_fingerprint: fingerprint,
      error_origin: origin,
      error_surface: "client",
    },
  };
}

/** Sends a budgeted, scrubbed `$exception` once per error object. */
export function captureAnalyticsException(value: unknown, origin: ErrorOrigin): boolean {
  if (client === null || !(getBrowserConsent()?.allowed() ?? false)) return false;
  if (value !== null && typeof value === "object") {
    if (seenErrors.has(value)) return false;
    seenErrors.add(value);
  }
  const capture = analyticsExceptionCapture(value, origin);
  if (capture === null) return false;
  client.captureException(capture.error, capture.properties);
  return true;
}

export function installExceptionCapture(): () => void {
  const onError = (event: ErrorEvent): void => {
    if (event.error instanceof Error) captureAnalyticsException(event.error, "window_error");
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    captureAnalyticsException(event.reason, "unhandled_rejection");
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
