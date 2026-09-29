import {
  appPathFromPublicSitePath,
  publicSitePath,
  SITE_DOMAIN,
  SITE_HOST_ORIGIN,
  type SitePath,
} from "./site";

export const POSTHOG_ANALYTICS_SCHEMA_VERSION = 1 as const;
export const POSTHOG_SITE_ID = "stripe-history" as const;
export const POSTHOG_API_HOST = "https://us.i.posthog.com" as const;
export const POSTHOG_COOKILESS_DISTINCT_ID = "$posthog_cookieless" as const;

const CANONICAL_DOMAIN = SITE_DOMAIN;
const CANONICAL_ORIGIN = SITE_HOST_ORIGIN;

const STATIC_ROUTES = [
  ["/", "history_timeline"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/privacy", "privacy"],
  ["/data", "data_index"],
  ["/history/payment-volume", "payment_volume"],
  ["/history/net-revenue", "net_revenue"],
  ["/history/valuation", "valuation"],
] as const;

const staticPageKindByPath = new Map<string, string>(STATIC_ROUTES);
const categoryPaths = new Set<string>([
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
] as const);

export const PUBLIC_ANALYTICS_PATHS = [
  ...STATIC_ROUTES.map(([path]) => path),
  ...categoryPaths,
] as const;

export type AnalyticsRoute = Readonly<{
  analytics_schema_version: typeof POSTHOG_ANALYTICS_SCHEMA_VERSION;
  canonical_domain: typeof CANONICAL_DOMAIN;
  canonical_path: string;
  page_kind: string;
  site_id: typeof POSTHOG_SITE_ID;
}>;

function canonicalPathname(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
}

export function classifyPublicAnalyticsRoute(value: string | URL): AnalyticsRoute | null {
  try {
    const url = value instanceof URL ? value : new URL(value);
    if (
      url.origin !== CANONICAL_ORIGIN
      || url.username !== ""
      || url.password !== ""
      || url.port !== ""
    ) {
      return null;
    }

    const publicPath = canonicalPathname(url.pathname);
    const appPath = appPathFromPublicSitePath(publicPath);
    if (appPath === null) return null;
    const staticPageKind = staticPageKindByPath.get(appPath);
    const pageKind = staticPageKind
      ?? (categoryPaths.has(appPath) ? "history_category" : null);
    if (pageKind === null) return null;

    const canonicalPath = publicSitePath(appPath as SitePath);

    return {
      analytics_schema_version: POSTHOG_ANALYTICS_SCHEMA_VERSION,
      canonical_domain: CANONICAL_DOMAIN,
      canonical_path: canonicalPath,
      page_kind: pageKind,
      site_id: POSTHOG_SITE_ID,
    };
  } catch {
    return null;
  }
}

/** PostHog's marker for a pageview with no referring site. */
export const DIRECT_REFERRER = "$direct" as const;
/** The longest DNS host name, which is also the byte ceiling for the referrer property. */
export const MAX_REFERRER_HOST_LENGTH = 253;
const MAX_RAW_REFERRER_LENGTH = 2_048;
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/u;

/**
 * Reduce a browser referrer to its host name. The path, query, fragment,
 * port, and credentials never leave this function. An empty referrer is a
 * direct visit; anything that is not an http(s) URL with an ordinary host
 * name returns null so the property is dropped.
 */
export function referrerHost(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return DIRECT_REFERRER;
  if (typeof value !== "string" || value.length > MAX_RAW_REFERRER_LENGTH) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    return HOST_NAME.test(host) ? host : null;
  } catch {
    return null;
  }
}

export function canonicalAnalyticsUrl(route: AnalyticsRoute): string {
  return `${CANONICAL_ORIGIN}${route.canonical_path}`;
}
