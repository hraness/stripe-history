import type { CategorizedHistoryEvent, HistoryCollection } from "@/lib/content";
import { historyEventPath } from "@/lib/history-urls";

import {
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
  SITE_ORIGIN,
  site,
  type SitePath,
} from "./site";

export interface BreadcrumbItem {
  readonly name: string;
  readonly path: SitePath;
}

function absoluteUrl(path: SitePath): string {
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

const publisherJsonLd = {
  "@type": "Organization",
  "@id": `${HRANESS_URL}#organization`,
  name: "Hraness",
  url: HRANESS_URL,
  sameAs: ["https://github.com/hraness"],
} as const;

export function siteOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: site.name,
    alternateName: site.domain,
    description: site.description,
    url: `${SITE_ORIGIN}/`,
    sameAs: [GITHUB_REPOSITORY_URL],
    parentOrganization: publisherJsonLd,
  } as const;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    url: `${SITE_ORIGIN}/`,
    name: site.name,
    alternateName: site.domain,
    description: site.description,
    inLanguage: "en-US",
    publisher: publisherJsonLd,
    sameAs: [GITHUB_REPOSITORY_URL],
  } as const;
}

export function historyCollectionJsonLd(
  items: readonly Readonly<{
    readonly categoryId?: CategorizedHistoryEvent["categoryId"];
    readonly id: string;
    readonly title: string;
  }>[],
  input: Readonly<{
    description: string;
    path: SitePath;
    title: string;
  }>,
) {
  const url = absoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: input.title,
    description: input.description,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    publisher: publisherJsonLd,
    about: {
      "@type": "Organization",
      name: "Stripe",
      url: "https://stripe.com/",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: item.categoryId === undefined
          ? `${url}#${item.id}`
          : absoluteUrl(historyEventPath(item.categoryId, item.id)),
      })),
    },
  } as const;
}

export function historyEventJsonLd(event: CategorizedHistoryEvent) {
  const path = historyEventPath(event.categoryId, event.id);
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#event`,
    url,
    headline: event.title,
    description: event.summary,
    datePublished: event.date,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    publisher: publisherJsonLd,
    about: {
      "@type": "Organization",
      name: "Stripe",
      url: "https://stripe.com/",
    },
    citation: event.sources.map((source) => ({
      "@type": "CreativeWork" as const,
      name: source.title,
      url: source.url,
      publisher: {
        "@type": "Organization" as const,
        name: source.publisher,
      },
    })),
  } as const;
}

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  } as const;
}

export function aboutPageJsonLd() {
  const url = absoluteUrl("/about");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#page`,
    url,
    name: `About ${site.domain}`,
    description:
      `The scope, sourcing, editorial review, independence, corrections, and privacy practices behind the ${site.domain} company timeline.`,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    publisher: publisherJsonLd,
    about: {
      "@type": "Organization",
      name: "Stripe",
      url: "https://stripe.com/",
    },
  } as const;
}

export function historyDatasetJsonLd(history: HistoryCollection) {
  const dates = history.events.map(({ date }) => date).toSorted();
  const earliestYear = dates.at(0)?.slice(0, 4);
  const latestYear = dates.at(-1)?.slice(0, 4);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${SITE_ORIGIN}/data#dataset`,
    name: "Stripe Company History Dataset",
    alternateName: "Stripedex Dataset",
    description: site.datasetDescription,
    url: `${SITE_ORIGIN}/data`,
    identifier: `${SITE_ORIGIN}/data#dataset`,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    license: `${GITHUB_REPOSITORY_URL}/blob/main/LICENSE`,
    sameAs: `${GITHUB_REPOSITORY_URL}/tree/main/public`,
    creator: publisherJsonLd,
    publisher: publisherJsonLd,
    about: {
      "@type": "Organization",
      name: "Stripe",
      url: "https://stripe.com/",
    },
    measurementTechnique:
      "Source-linked editorial review of chronology, category placement, claim status, confidence, and duplicate claims.",
    ...(earliestYear === undefined || latestYear === undefined
      ? {}
      : { temporalCoverage: `${earliestYear}/${latestYear}` }),
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Sourced timeline records",
        value: history.events.length,
      },
      {
        "@type": "PropertyValue",
        name: "Valuation observations",
        value: history.valuations.length,
      },
      {
        "@type": "PropertyValue",
        name: "Annual volume disclosures",
        value: history.annualVolumes.length,
      },
      {
        "@type": "PropertyValue",
        name: "Leadership appearances",
        value: history.appearances.length,
      },
      {
        "@type": "PropertyValue",
        name: "Canonical research sources",
        value: history.sources.length,
      },
    ],
    keywords: [
      "Stripe history",
      "company history",
      "fintech",
      "payments",
      "acquisitions",
      "funding",
      "product launches",
      "annual payment volume",
      "private company valuation",
      "leadership appearances",
      "research provenance",
    ],
    distribution: [
      ...history.categories.map((category) => ({
        "@type": "DataDownload" as const,
        name: category.id === "appearances"
          ? "Stripe leadership appearances"
          : `${category.label} history records`,
        contentUrl: category.id === "appearances"
          ? `${SITE_ORIGIN}/research/appearances.yml`
          : `${SITE_ORIGIN}/history/${category.id}.yml`,
        encodingFormat: "application/yaml",
      })),
      {
        "@type": "DataDownload" as const,
        name: "Research source catalog",
        contentUrl: `${SITE_ORIGIN}/research/sources.yml`,
        encodingFormat: "application/yaml",
      },
      {
        "@type": "DataDownload" as const,
        name: "Stripe valuation observations",
        contentUrl: `${SITE_ORIGIN}/research/valuations.yml`,
        encodingFormat: "application/yaml",
      },
      {
        "@type": "DataDownload" as const,
        name: "Research collection definitions",
        contentUrl: `${SITE_ORIGIN}/research/collections.yml`,
        encodingFormat: "application/yaml",
      },
      {
        "@type": "DataDownload" as const,
        name: "Research run ledger",
        contentUrl: `${SITE_ORIGIN}/research/runs.yml`,
        encodingFormat: "application/yaml",
      },
    ],
  } as const;
}

export function appearanceCollectionJsonLd(history: HistoryCollection) {
  const url = `${SITE_ORIGIN}/history/appearances`;
  const sourceById = new Map(history.sources.map((source) => [source.id, source]));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: "Stripe Leadership Appearances",
    description:
      "Reviewed podcasts, interviews, talks, and testimony from Stripe founders and senior leaders, with source-linked summaries and transcripts when available.",
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    publisher: publisherJsonLd,
    about: { "@type": "Organization", name: "Stripe", url: "https://stripe.com/" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: history.appearances.length,
      itemListElement: history.appearances.map((appearance, index) => {
        const source = sourceById.get(appearance.source_ids[0] ?? "");
        const itemType = appearance.media.includes("video") ? "VideoObject" : "PodcastEpisode";
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": itemType,
            "@id": `${SITE_ORIGIN}${historyEventPath("appearances", appearance.id)}#event`,
            url: `${SITE_ORIGIN}${historyEventPath("appearances", appearance.id)}`,
            name: appearance.title,
            description: appearance.digest?.gist ?? appearance.significance,
            datePublished: appearance.published_at ?? appearance.occurred_at,
            ...(appearance.duration_seconds === undefined
              ? {}
              : { duration: `PT${appearance.duration_seconds}S` }),
            ...(source === undefined ? {} : { contentUrl: source.url }),
            about: { "@type": "Organization", name: "Stripe" },
            contributor: appearance.participants.map((participant) => ({
              "@type": "Person",
              name: participant.name,
              ...(participant.stripe_role === undefined
                ? {}
                : { jobTitle: participant.stripe_role }),
            })),
          },
        };
      }),
    },
  } as const;
}
