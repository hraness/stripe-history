import type { BrowserConfig } from "@hraness/analytics/browser";

/**
 * Stripe History measures visits with the shared Hraness analytics standard
 * (`@hraness/analytics`), configured exactly as hraness.com configures it, so
 * one consent answer and one `hraness-*` cookie cover the whole host. The
 * `/ph` PostHog proxy and the `/api/region` lookup are hraness.com's own
 * root-path endpoints, outside `/stripe`; this app serves neither.
 */

/** Public, write-only project token for PostHog project 543691 (Hraness). */
export const POSTHOG_TOKEN = "phc_xqEpQgmKxZDYda3DvForfnKDuVL6urqD2YTtqDPmUL4u" as const;
/** The `site_id` Stripe History has always reported under. */
export const ANALYTICS_SITE_ID = "stripe-history" as const;
/** Shared with hraness.com: one `hraness-id` and `hraness-choice` across the host. */
export const ANALYTICS_STORAGE_PREFIX = "hraness" as const;
export const ANALYTICS_HOSTS = ["hraness.com"] as const;
/** hraness.com's same-origin PostHog proxy (root path, not under `/stripe`). */
export const ANALYTICS_API_HOST = "/ph" as const;
/** hraness.com's same-origin region endpoint (root path, not under `/stripe`). */
export const ANALYTICS_REGION_URL = "/api/region" as const;
export const PRIVACY_PATH = "/stripe/privacy" as const;
export const PRIVACY_CHOICES_PATH = `${PRIVACY_PATH}#choices` as const;

/** Product events beside the shared taxonomy. Each carries only bounded labels. */
export const PRODUCT_EVENTS = [
  "history filter selected",
  "source link opened",
  "page not found",
] as const;
export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

const productEvents: ReadonlySet<string> = new Set(PRODUCT_EVENTS);
export function isProductEvent(value: unknown): value is ProductEvent {
  return typeof value === "string" && productEvents.has(value);
}

const STATIC_KINDS: Readonly<Record<string, string>> = {
  "/stripe": "history_timeline",
  "/stripe/about": "about",
  "/stripe/contact": "contact",
  "/stripe/privacy": "privacy",
  "/stripe/data": "data_index",
  "/stripe/history/payment-volume": "payment_volume",
  "/stripe/history/net-revenue": "net_revenue",
  "/stripe/history/valuation": "valuation",
};

/** The `page_kind` for a public path on hraness.com. */
export function stripeHistoryPageKind(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  const fixed = STATIC_KINDS[path];
  if (fixed !== undefined) return fixed;
  if (/^\/stripe\/events\/[a-z0-9-]+$/u.test(path)) return "history_event";
  if (/^\/stripe\/history\/[a-z0-9-]+$/u.test(path)) return "history_category";
  return "other";
}

/** Matches hraness.com's own banner wording; this site runs no ads. */
export const CONSENT_WORDS = {
  allBody: "May we count your visit with a cookie and record how pages are used (never what you type)?",
  adsBody: "May we record how pages are used (never what you type)?",
  allow: "Yes",
  decline: "No",
  privacy: "Privacy",
  on: "Analytics is on for this browser.",
  off: "Analytics is off for this browser. Visits are still counted without cookies.",
  adsOff: "Recordings are off for this browser.",
} as const;

/** The complete browser configuration for one page load at `pathname`. */
export function analyticsConfig(pathname: string): BrowserConfig {
  return {
    token: POSTHOG_TOKEN,
    apiHost: ANALYTICS_API_HOST,
    regionUrl: ANALYTICS_REGION_URL,
    hosts: ANALYTICS_HOSTS,
    siteId: ANALYTICS_SITE_ID,
    storagePrefix: ANALYTICS_STORAGE_PREFIX,
    preset: "marketing",
    pageKind: stripeHistoryPageKind(pathname),
    landingKind: stripeHistoryPageKind,
    privacyHref: PRIVACY_PATH,
    words: CONSENT_WORDS,
  };
}
