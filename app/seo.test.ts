import { describe, expect, test } from "bun:test";
import { serializeJsonLd } from "@hraness/web-discovery";
import { loadHistory } from "@/lib/content";

import {
  aboutPageJsonLd,
  appearanceCollectionJsonLd,
  breadcrumbJsonLd,
  historyCollectionJsonLd,
  historyDatasetJsonLd,
  historyEventJsonLd,
  siteOrganizationJsonLd,
  websiteJsonLd,
} from "./seo";

describe("stripedex.com structured discovery", () => {
  test("identifies Stripedex, Hraness as publisher, and Stripe only as its subject", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      "@id": "https://stripedex.com/#website",
      name: "Stripedex",
      alternateName: "stripedex.com",
      publisher: {
        "@type": "Organization",
        name: "Hraness",
        url: "https://hraness.com/",
      },
      sameAs: ["https://github.com/hraness/stripedex"],
      url: "https://stripedex.com/",
    });
    expect(aboutPageJsonLd()).toMatchObject({
      "@type": "WebPage",
      about: { "@type": "Organization", name: "Stripe" },
      publisher: { name: "Hraness" },
    });
    expect(siteOrganizationJsonLd()).toMatchObject({
      "@type": "Organization",
      "@id": "https://stripedex.com/#organization",
      name: "Stripedex",
      url: "https://stripedex.com/",
      sameAs: ["https://github.com/hraness/stripedex"],
      parentOrganization: { name: "Hraness", url: "https://hraness.com/" },
    });
    expect(siteOrganizationJsonLd()).not.toHaveProperty("address");
    expect(siteOrganizationJsonLd()).not.toHaveProperty("contactPoint");
  });

  test("describes the open YAML records as a truthful dataset", async () => {
    const dataset = historyDatasetJsonLd(await loadHistory());

    expect(dataset).toMatchObject({
      "@type": "Dataset",
      "@id": "https://stripedex.com/data#dataset",
      alternateName: "Stripedex Dataset",
      creator: { name: "Hraness" },
      identifier: "https://stripedex.com/data#dataset",
      inLanguage: "en-US",
      license: "https://github.com/hraness/stripedex/blob/main/LICENSE",
      measurementTechnique: expect.stringContaining("Source-linked editorial review"),
      name: "Stripe Company History Dataset",
      sameAs: "https://github.com/hraness/stripedex/tree/main/public",
      temporalCoverage: "2005/2026",
    });
    expect(dataset.variableMeasured).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Valuation observations", value: 25 }),
      expect.objectContaining({ name: "Annual volume disclosures", value: 5 }),
      expect.objectContaining({ name: "Leadership appearances", value: 41 }),
    ]));
    expect(dataset.distribution).toHaveLength(16);
    expect(dataset.distribution).toContainEqual({
      "@type": "DataDownload",
      contentUrl: "https://stripedex.com/history/acquisitions.yml",
      encodingFormat: "application/yaml",
      name: "Acquisitions history records",
    });
    expect(dataset.distribution).toContainEqual({
      "@type": "DataDownload",
      contentUrl: "https://stripedex.com/research/appearances.yml",
      encodingFormat: "application/yaml",
      name: "Stripe leadership appearances",
    });
    expect(dataset.distribution).toContainEqual({
      "@type": "DataDownload",
      contentUrl: "https://stripedex.com/research/valuations.yml",
      encodingFormat: "application/yaml",
      name: "Stripe valuation observations",
    });
  });

  test("anchors appearance entities in the timeline category", async () => {
    const history = await loadHistory();
    const collection = appearanceCollectionJsonLd(history);

    expect(collection).toMatchObject({
      "@id": "https://stripedex.com/history/appearances#collection",
      url: "https://stripedex.com/history/appearances",
      mainEntity: {
        numberOfItems: history.appearances.length,
      },
    });
    expect(collection.mainEntity.itemListElement[0]?.item).toMatchObject({
      "@id": expect.stringContaining(
        "/history/appearances/appearance-2026-08-will-gaybrick-a16z#event",
      ),
      "@type": "VideoObject",
      url: "https://stripedex.com/history/appearances/appearance-2026-08-will-gaybrick-a16z",
    });
  });

  test("describes canonical history items and breadcrumbs", () => {
    const rootHistory = historyCollectionJsonLd(
      [{
        categoryId: "company-milestones",
        id: "example-event",
        title: "Stripe reaches an example milestone",
      }],
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
        url: "https://stripedex.com/history/company-milestones/example-event",
      }],
    });

    const categoryHistory = historyCollectionJsonLd(
      [{
        categoryId: "company-milestones",
        id: "example-event",
        title: "Stripe reaches an example milestone",
      }],
      {
        description: "One sourced event.",
        path: "/history/company-milestones",
        title: "Stripe company milestones",
      },
    );
    expect(categoryHistory.mainEntity.itemListElement[0]?.url).toBe(
      "https://stripedex.com/history/company-milestones/example-event",
    );
    expect(historyEventJsonLd({
      categoryId: "acquisitions",
      categoryLabel: "Acquisitions",
      categoryOrder: 3,
      confidence: "reported",
      date: "2026-07-24",
      date_precision: "day",
      id: "openrouter-acquisition-talks-reported",
      sourceIds: ["source-990ab773c6c0913272f7"],
      sources: [{
        kind: "reporting",
        publisher: "TechCrunch",
        title: "Example source",
        url: "https://techcrunch.com/example",
      }],
      summary: "Stripe held talks to acquire AI-model marketplace OpenRouter at a reported price.",
      title: "Stripe reportedly discusses acquiring OpenRouter",
    })).toMatchObject({
      "@type": "Article",
      url: "https://stripedex.com/history/acquisitions/openrouter-acquisition-talks-reported",
      headline: "Stripe reportedly discusses acquiring OpenRouter",
    });
    expect(breadcrumbJsonLd([
      { name: "History", path: "/" },
      { name: "Company milestones", path: "/history/company-milestones" },
    ]).itemListElement[1]?.item).toBe(
      "https://stripedex.com/history/company-milestones",
    );
  });

  test("uses the shared script-safe serializer", () => {
    expect(serializeJsonLd({ value: "</script>&" })).toBe(
      '{"value":"\\u003c/script\\u003e\\u0026"}',
    );
  });
});
