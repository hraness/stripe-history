import type { Metadata } from "next";

export const SITE_DOMAIN = "hraness.com" as const;
export const SITE_HOST_ORIGIN = `https://${SITE_DOMAIN}` as const;
export const SITE_BASE_PATH = "/stripe" as const;
export const SITE_ORIGIN = `${SITE_HOST_ORIGIN}${SITE_BASE_PATH}` as const;
export const SITE_LABEL = "hraness.com/stripe" as const;
export const GITHUB_REPOSITORY_URL =
  "https://github.com/hraness/stripe-history" as const;
export const HRANESS_URL = "https://hraness.com/" as const;

export type SitePath = `/${string}`;

export function publicSitePath(path: SitePath): string {
  return path === "/" ? SITE_BASE_PATH : `${SITE_BASE_PATH}${path}`;
}

export function appPathFromPublicSitePath(pathname: string): SitePath | null {
  if (pathname === SITE_BASE_PATH || pathname === `${SITE_BASE_PATH}/`) return "/";
  if (!pathname.startsWith(`${SITE_BASE_PATH}/`)) return null;
  return pathname.slice(SITE_BASE_PATH.length) as SitePath;
}

export function absoluteSiteUrl(path: SitePath): string {
  return path === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${path}`;
}

const tagline = "Every event in Stripe’s history, dated and sourced.";

export const site = {
  applicationName: "Stripe History",
  category: "Independent company history",
  datasetDescription:
    "Download the YAML files behind this Stripe history: every dated event with its sources, plus valuation observations and annual volume and revenue figures.",
  description:
    "Stripe History is an independent record of how Stripe grew. Every event is dated and linked to its sources, and the data downloads as open YAML.",
  domain: SITE_LABEL,
  heroSummary:
    "An independent, dated record of how Stripe grew, from the 2010 Buenos Aires prototype to the latest reported volume. Open data throughout.",
  long:
    "Stripe is private, so its history arrives in pieces: annual letters, tender offers, press reports, podcasts, and blog posts. Stripe History, built by Hraness, gathers those pieces into one dated record, from Patrick Collison’s 2005 Young Scientist win and the 2010 prototype built in Buenos Aires cafes to the $1.9 trillion in total volume Stripe reported for 2025. Every event links to its sources, reported talks stay distinct from completed deals, and each valuation keeps its type. Charts follow volume, revenue, and valuation by year, and the whole record downloads as YAML under the MIT License. It is not affiliated with Stripe, Inc.",
  name: "Stripe History",
  socialImageAlt: `Stripe History: ${tagline}`,
  tagline,
  titleTemplate: `%s | Stripe History`,
} as const;

export function socialMetadata(
  title: string,
  description: string,
  url: SitePath,
  image: Readonly<{
    alt?: string;
    path?: SitePath;
  }> = {},
): Pick<Metadata, "openGraph" | "twitter"> {
  const imageAlt = image.alt ?? site.socialImageAlt;
  const imagePath = image.path ?? "/opengraph-image";
  return {
    openGraph: {
      type: "website" as const,
      locale: "en_US",
      url: absoluteSiteUrl(url),
      siteName: site.name,
      title,
      description,
      images: [{
        alt: imageAlt,
        height: 630,
        url: absoluteSiteUrl(imagePath),
        width: 1200,
      }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [{ alt: imageAlt, url: absoluteSiteUrl(imagePath) }],
    },
  };
}
