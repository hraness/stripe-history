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

export const site = {
  applicationName: "Stripe History",
  datasetDescription:
    "Download the YAML files behind this Stripe history: every dated event with its sources, plus valuation observations and annual volume and revenue figures.",
  description:
    "An independent, sourced Stripe history from the 2010 devpayments.com prototype and September 2011 public launch to today, covering acquisitions, products, leadership, funding, valuation, expansion, offices, publishing, company milestones, annual volume, and net revenue.",
  domain: SITE_LABEL,
  historyTitle: "Stripe company history",
  name: "Stripe History",
  socialImageAlt: "Stripe History: a dated, sourced timeline of the company",
  title: `Stripe company history | ${SITE_LABEL}`,
  titleTemplate: `%s | ${SITE_LABEL}`,
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
