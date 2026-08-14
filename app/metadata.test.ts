import { describe, expect, test } from "bun:test";
import { historyCategoryIds } from "@/lib/history-schema";
import nextConfig from "../next.config";

import { metadata } from "./layout";
import manifest from "./manifest";
import { alt as socialImageAlt } from "./opengraph-image";
import robots from "./robots";
import sitemap from "./sitemap";
import { SITE_ORIGIN, site } from "./site";

describe("stripehistory.com public identity", () => {
  test("states the canonical history collection", () => {
    expect(site).toMatchObject({
      applicationName: "Stripe History",
      domain: "stripehistory.com",
      historyTitle: "Stripe Company History",
      name: "Stripe History",
      title: "Stripe Company History | stripehistory.com",
    });
    expect(site.description).toContain("independent, sourced timeline of Stripe");
  });

  test("publishes only canonical history, category, scale, and editorial routes", async () => {
    const entries = await sitemap();
    const urls = entries.map(({ url }) => url);

    expect(urls).toEqual(expect.arrayContaining([
      SITE_ORIGIN,
      `${SITE_ORIGIN}/history/payment-volume`,
      `${SITE_ORIGIN}/history/valuation`,
      `${SITE_ORIGIN}/about`,
      `${SITE_ORIGIN}/data`,
      ...historyCategoryIds.map((id) => `${SITE_ORIGIN}/history/${id}`),
    ]));
    expect(urls).not.toContain(`${SITE_ORIGIN}/history`);
    expect(urls.some((url) => url.startsWith(`${SITE_ORIGIN}/news/`))).toBe(false);
    expect(entries.every((entry) => entry.changeFrequency === undefined)).toBe(true);
    expect(entries.every((entry) => entry.priority === undefined)).toBe(true);
    expect(robots()).toMatchObject({
      rules: {
        allow: "/",
        userAgent: "*",
      },
      sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  test("keeps canonical metadata on stripehistory.com", () => {
    expect(robots()).toMatchObject({ host: SITE_ORIGIN });
    expect(manifest()).toMatchObject({
      description: site.description,
      id: "/",
      name: site.historyTitle,
      short_name: site.applicationName,
      start_url: "/",
    });
    expect(new URL(metadata.metadataBase ?? "https://invalid.example").origin).toBe(
      SITE_ORIGIN,
    );
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.title).toEqual({
      default: site.title,
      template: site.titleTemplate,
    });
    expect(metadata.description).toBe(site.description);
    expect(metadata.openGraph?.title).toBe(site.title);
    expect(metadata.twitter?.title).toBe(site.title);
    expect(socialImageAlt).toBe(site.socialImageAlt);
  });

  test("keeps inspectable history and research YAML out of search results", async () => {
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/history/:category.yml",
    });
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/research/:path*",
    });
  });

  test("redirects former and www hosts directly to the canonical origin", async () => {
    expect(await nextConfig.redirects?.()).toEqual([
      {
        destination: "https://stripehistory.com",
        has: [{ type: "host", value: "stripe.town" }],
        permanent: true,
        source: "/history",
      },
      {
        destination: "https://stripehistory.com/:path*",
        has: [{ type: "host", value: "stripe.town" }],
        permanent: true,
        source: "/:path*",
      },
      {
        destination: "https://stripehistory.com",
        has: [{ type: "host", value: "www.stripehistory.com" }],
        permanent: true,
        source: "/history",
      },
      {
        destination: "https://stripehistory.com/:path*",
        has: [{ type: "host", value: "www.stripehistory.com" }],
        permanent: true,
        source: "/:path*",
      },
    ]);
  });
});
