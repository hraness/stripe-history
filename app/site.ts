import type { Metadata } from "next";
import { productMessaging } from "./product-messaging";

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

/**
 * Whether a path names a file (llms.txt, the sitemap, a dataset) rather than a page. Link to a
 * file with a plain `<a>`, never the router's `<Link>`: the router first asks for the address's
 * page data, which production serves from a `<path>.rsc` file that only pages have, so for a file
 * it answers with an error (500 for llms.txt, 404 for the others). `next start` serves the file
 * itself, so only a check against production sees it.
 */
export function isFilePath(pathname: string): boolean {
  return /\.[a-z]+$/u.test(pathname);
}

const { names, category, meta, hero, long, tagline } = productMessaging;

export const site = {
  applicationName: names.name,
  category,
  datasetDescription:
    "Download the YAML files behind this Stripe history: every dated event with its sources, plus valuation observations and annual volume and revenue figures.",
  description: meta,
  domain: SITE_LABEL,
  heroHeading: hero.heading,
  heroSummary: hero.summary,
  long,
  name: names.name,
  socialImageAlt: `${names.name}: ${tagline}`,
  tagline,
  titleTemplate: `%s | ${names.name}`,
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
  const imageAlt = image.alt ?? (url === "/" ? "The Stripe History timeline and company statistics." : site.socialImageAlt);
  const imagePath = image.path ?? (url === "/" ? "/share/poster.jpg" : "/opengraph-image");
  return {
    openGraph: {
      type: "website" as const,
      locale: "en_US",
      url: absoluteSiteUrl(url),
      siteName: site.name,
      title,
      description,
      ...(url === "/" && {
        videos: [{ url: absoluteSiteUrl("/share/preview.mp4"), secureUrl: absoluteSiteUrl("/share/preview.mp4"), width: 1200, height: 630, type: "video/mp4" }],
      }),
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
