import type { Metadata } from "next";

export const SITE_DOMAIN = "stripedex.com" as const;
export const SITE_ORIGIN = `https://${SITE_DOMAIN}` as const;
export const GITHUB_REPOSITORY_URL =
  "https://github.com/hraness/stripedex" as const;
export const HRANESS_URL = "https://hraness.com/" as const;

export type SitePath = `/${string}`;

export const site = {
  applicationName: "Stripedex",
  datasetDescription:
    "Open, source-linked YAML records behind the Stripe company history timeline, including events, valuation observations, annual volume disclosures, leadership appearances, source provenance, collection scope, and review runs.",
  description:
    "An independent, sourced timeline of Stripe acquisitions, products, leadership, funding, valuation, expansion, offices, publishing, company milestones, and annual volume.",
  domain: SITE_DOMAIN,
  historyTitle: "Stripe Company History",
  name: "Stripedex",
  socialImageAlt: `Stripe company history timeline from ${SITE_DOMAIN}`,
  title: `Stripe Company History | ${SITE_DOMAIN}`,
  titleTemplate: `%s | ${SITE_DOMAIN}`,
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
      url,
      siteName: site.name,
      title,
      description,
      images: [{
        alt: imageAlt,
        height: 630,
        url: imagePath,
        width: 1200,
      }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [{ alt: imageAlt, url: imagePath }],
    },
  };
}
