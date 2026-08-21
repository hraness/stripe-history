export const POSTHOG_ANALYTICS_SCHEMA_VERSION = 1 as const;
export const POSTHOG_SITE_ID = "stripedex" as const;
export const POSTHOG_API_HOST = "https://us.i.posthog.com" as const;
export const POSTHOG_COOKILESS_DISTINCT_ID = "$posthog_cookieless" as const;

const CANONICAL_DOMAIN = "stripedex.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_DOMAIN}`;

const STATIC_ROUTES = [
  ["/", "history_timeline"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/privacy", "privacy"],
  ["/data", "data_index"],
  ["/history/payment-volume", "payment_volume"],
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

    const canonicalPath = canonicalPathname(url.pathname);
    const staticPageKind = staticPageKindByPath.get(canonicalPath);
    const pageKind = staticPageKind
      ?? (categoryPaths.has(canonicalPath) ? "history_category" : null);
    if (pageKind === null) return null;

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

export function canonicalAnalyticsUrl(route: AnalyticsRoute): string {
  return `${CANONICAL_ORIGIN}${route.canonical_path}`;
}
