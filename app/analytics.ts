import {
  classifyAnalyticsRoute,
  POSTHOG_SCHEMA_VERSION,
  type AnalyticsRouteContext,
  type AnalyticsRouteRule,
  type PostHogSiteDefinition,
} from "@hraness/posthog/site";
import { publicSitePath, SITE_DOMAIN, type SitePath } from "./site";

export const POSTHOG_SITE_ID = "stripe-history" as const;
export const POSTHOG_API_HOST = "https://us.i.posthog.com" as const;
export const POSTHOG_COOKILESS_DISTINCT_ID = "$posthog_cookieless" as const;
export const NOT_FOUND_PAGE_KIND = "not_found" as const;

const STATIC_ROUTES = [
  ["/", "history_timeline"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/privacy", "privacy"],
  ["/data", "data_index"],
  ["/history/payment-volume", "payment_volume"],
  ["/history/net-revenue", "net_revenue"],
  ["/history/valuation", "valuation"],
] as const satisfies readonly (readonly [SitePath, string])[];

const CATEGORY_PATHS = [
  "/history/origins-and-early-company",
  "/history/executives-and-team",
  "/history/acquisitions",
  "/history/product-launches",
  "/history/country-expansion",
  "/history/payment-and-payout-expansion",
  "/history/fundraising",
  "/history/headquarters-and-offices",
  "/history/publishing",
  "/history/side-quests",
  "/history/company-milestones",
  "/history/appearances",
] as const satisfies readonly SitePath[];

/** App-relative paths of every public page that analytics classifies by name. */
export const PUBLIC_ANALYTICS_PATHS = [
  ...STATIC_ROUTES.map(([path]) => path),
  ...CATEGORY_PATHS,
] as const;

const ROUTES: readonly AnalyticsRouteRule[] = [
  ...STATIC_ROUTES.map(([path, pageKind]) => ({
    match: "exact" as const,
    path: publicSitePath(path),
    pageKind,
  })),
  ...CATEGORY_PATHS.map((path) => ({
    match: "exact" as const,
    path: publicSitePath(path),
    pageKind: "history_category",
  })),
];

/**
 * The PostHog site definition for hraness.com/stripe (portfolio observability
 * standard, version 2). The existing referrer-only policy excludes campaign attribution.
 */
export const analyticsSite: PostHogSiteDefinition = {
  id: POSTHOG_SITE_ID,
  canonicalDomain: SITE_DOMAIN,
  allowedHosts: [SITE_DOMAIN, `www.${SITE_DOMAIN}`],
  schemaVersion: POSTHOG_SCHEMA_VERSION,
  routes: ROUTES,
  customEvents: [],
  attributionMode: "referrer_only",
  allowedPaths: [{ match: "prefix", path: "/stripe" }],
  excludedPaths: ["/stripe/api", "/stripe/auth", "/stripe/account", "/stripe/dashboard"].map((path) => ({ match: "prefix", path })),
};

const SITE_BASE_PATH_PREFIX = publicSitePath("/");

/**
 * Classifies a URL on this site. Paths under `/stripe` that match no public
 * page are the 404 page, so they carry `page_kind: "not_found"`. URLs on other
 * hosts or outside `/stripe` return null.
 */
export function classifyStripeHistoryRoute(
  value: string | URL,
  site: PostHogSiteDefinition = analyticsSite,
): AnalyticsRouteContext | null {
  const route = classifyAnalyticsRoute(site, value);
  if (route === null) return null;
  const path = route.canonical_path;
  if (path !== SITE_BASE_PATH_PREFIX && !path.startsWith(`${SITE_BASE_PATH_PREFIX}/`)) {
    return null;
  }
  return route.page_kind === "other" ? { ...route, page_kind: NOT_FOUND_PAGE_KIND } : route;
}
