import { describe, expect, test } from "bun:test";
import { serializeJsonLd } from "@/support/discovery";
import { loadHistory } from "@/lib/content";

import {
  aboutPageJsonLd,
  breadcrumbJsonLd,
  historyCollectionJsonLd,
  historyDatasetJsonLd,
  websiteJsonLd,
} from "./seo";

describe("stripehistory.com structured discovery", () => {
  test("identifies Stripe History, Hraness as publisher, and Stripe only as its subject", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      "@id": "https://stripehistory.com/#website",
      name: "Stripe History",
      alternateName: "stripehistory.com",
      publisher: {
        "@type": "Organization",
        name: "Hraness",
        url: "https://hraness.com/",
      },
      sameAs: ["https://github.com/hraness/stripe-history"],
      url: "https://stripehistory.com/",
    });
    expect(aboutPageJsonLd()).toMatchObject({
      "@type": "WebPage",
      about: { "@type": "Organization", name: "Stripe" },
      publisher: { name: "Hraness" },
    });
  });

  test("describes the open YAML records as a truthful dataset", async () => {
    const dataset = historyDatasetJsonLd(await loadHistory());

    expect(dataset).toMatchObject({
      "@type": "Dataset",
      "@id": "https://stripehistory.com/data#dataset",
      alternateName: "Stripe History Dataset",
      creator: { name: "Hraness" },
      identifier: "https://stripehistory.com/data#dataset",
      inLanguage: "en-US",
      license: "https://github.com/hraness/stripe-history/blob/main/LICENSE",
      measurementTechnique: expect.stringContaining("Source-linked editorial review"),
      name: "Stripe Company History Dataset",
      sameAs: "https://github.com/hraness/stripe-history/tree/main/public",
      temporalCoverage: "2005/2026",
    });
    expect(dataset.variableMeasured).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Valuation observations", value: 25 }),
      expect.objectContaining({ name: "Annual volume disclosures", value: 5 }),
    ]));
    expect(dataset.distribution).toHaveLength(16);
    expect(dataset.distribution).toContainEqual({
      "@type": "DataDownload",
      contentUrl: "https://stripehistory.com/history/acquisitions.yml",
      encodingFormat: "application/yaml",
      name: "Acquisitions history records",
    });
    expect(dataset.distribution).toContainEqual({
      "@type": "DataDownload",
      contentUrl: "https://stripehistory.com/research/valuations.yml",
      encodingFormat: "application/yaml",
      name: "Stripe valuation observations",
    });
  });

  test("describes canonical history items and breadcrumbs", () => {
    const rootHistory = historyCollectionJsonLd(
      [{ id: "example-event", title: "Stripe reaches an example milestone" }],
      {
        description: "One sourced event.",
        path: "/",
        title: "Stripe company history",
      },
    );
    expect(rootHistory.mainEntity).toMatchObject({
      "@type": "ItemList",
      numberOfItems: 1,
      itemListElement: [{
        position: 1,
        url: "https://stripehistory.com/#example-event",
      }],
    });

    const categoryHistory = historyCollectionJsonLd(
      [{ id: "example-event", title: "Stripe reaches an example milestone" }],
      {
        description: "One sourced event.",
        path: "/history/company-milestones",
        title: "Stripe company milestones",
      },
    );
    expect(categoryHistory.mainEntity.itemListElement[0]?.url).toBe(
      "https://stripehistory.com/history/company-milestones#example-event",
    );
    expect(breadcrumbJsonLd([
      { name: "History", path: "/" },
      { name: "Company milestones", path: "/history/company-milestones" },
    ]).itemListElement[1]?.item).toBe(
      "https://stripehistory.com/history/company-milestones",
    );
  });

  test("uses the shared script-safe serializer", () => {
    expect(serializeJsonLd({ value: "</script>&" })).toBe(
      '{"value":"\\u003c/script\\u003e\\u0026"}',
    );
  });
});
