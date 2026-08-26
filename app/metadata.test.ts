import { describe, expect, test } from "bun:test";
import { timelineCategoryIds } from "@/lib/history-schema";
import {
  PREVIEW_NOTICE_ORIGIN_ENV,
  PREVIEW_ROBOTS_HEADER,
  PREVIEW_ROBOTS_POLICY,
  PRODUCTION_DELIVERY_PROOF_HEADER,
  productionDeliveryProofToken,
} from "@hraness/vercel-delivery";
import nextConfig, { createNextConfig } from "../next.config";

import { metadata } from "./layout";
import manifest from "./manifest";
import { alt as socialImageAlt } from "./opengraph-image";
import robots from "./robots";
import sitemap from "./sitemap";
import { SITE_BASE_PATH, SITE_HOST_ORIGIN, SITE_ORIGIN, site } from "./site";

describe("hraness.com/stripe public identity", () => {
  test("states the canonical history collection", () => {
    expect(site).toMatchObject({
      applicationName: "Stripedex",
      domain: "hraness.com/stripe",
      historyTitle: "Stripe Company History",
      name: "Stripedex",
      title: "Stripe Company History | hraness.com/stripe",
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
      `${SITE_ORIGIN}/contact`,
      `${SITE_ORIGIN}/privacy`,
      `${SITE_ORIGIN}/data`,
      ...timelineCategoryIds.map((id) => `${SITE_ORIGIN}/history/${id}`),
    ]));
    expect(urls).not.toContain(
      `${SITE_ORIGIN}/history/acquisitions/openrouter-acquisition-talks-reported`,
    );
    expect(urls).not.toContain(`${SITE_ORIGIN}/appearances`);
    expect(urls).not.toContain(`${SITE_ORIGIN}/x-markdown`);
    expect(urls).toContain(SITE_ORIGIN);
    expect(urls).not.toContain(`${SITE_ORIGIN}/history`);
    expect(urls.some((url) => url.startsWith(`${SITE_ORIGIN}/news/`))).toBe(false);
    expect(urls.some((url) => url.startsWith(`${SITE_ORIGIN}/x-markdown`))).toBe(false);
    expect(entries.every((entry) => entry.changeFrequency === undefined)).toBe(true);
    expect(entries.every((entry) => entry.priority === undefined)).toBe(true);
    expect(robots()).toMatchObject({
      rules: {
        allow: "/stripe/",
        disallow: "/stripe/x-markdown",
        userAgent: "*",
      },
      sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    });
  });

  test("keeps only site-wide defaults that other routes can inherit", () => {
    expect(robots()).toMatchObject({ host: SITE_HOST_ORIGIN });
    expect(manifest()).toMatchObject({
      description: site.description,
      id: SITE_BASE_PATH,
      name: site.historyTitle,
      short_name: site.applicationName,
      start_url: SITE_BASE_PATH,
    });
    expect(new URL(metadata.metadataBase ?? "https://invalid.example").origin).toBe(
      SITE_HOST_ORIGIN,
    );
    expect(nextConfig.basePath).toBe(SITE_BASE_PATH);
    expect(metadata).toMatchObject({
      applicationName: site.applicationName,
      title: {
        default: site.applicationName,
        template: site.titleTemplate,
      },
      openGraph: {
        locale: "en_US",
        siteName: site.name,
        type: "website",
      },
    });
    expect(metadata).not.toHaveProperty("description");
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).not.toHaveProperty("url");
    expect(metadata.openGraph).not.toHaveProperty("title");
    expect(metadata.openGraph).not.toHaveProperty("description");
    expect(metadata.twitter).not.toHaveProperty("title");
    expect(metadata.twitter).not.toHaveProperty("description");
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
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/x-markdown",
    });
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/x-markdown/:path*",
    });
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "Vary", value: "Accept" }],
      source: "/",
    });
    expect(await nextConfig.headers?.()).toContainEqual({
      headers: [{ key: "Vary", value: "Accept" }],
      source: "/:path*",
    });
  });

  test("redirects former and www hosts directly to the canonical origin", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects?.at(0)).toEqual({
      destination: "/history/appearances",
      permanent: true,
      source: "/appearances",
    });
    expect(redirects?.slice(1)).toEqual([
      "stripedex.com",
      "www.stripedex.com",
      "stripehistory.com",
      "www.stripehistory.com",
      "stripe.town",
      "www.stripe.town",
      "stripe.guide",
      "www.stripe.guide",
    ].flatMap((host) => [
      {
        basePath: false,
        destination: "https://hraness.com/stripe",
        has: [{ type: "host", value: host }],
        permanent: true,
        source: "/history",
      },
      {
        basePath: false,
        destination: "https://hraness.com/stripe/history/appearances",
        has: [{ type: "host", value: host }],
        permanent: true,
        source: "/appearances",
      },
      {
        basePath: false,
        destination: "https://hraness.com/stripe",
        has: [{ type: "host", value: host }],
        permanent: true,
        source: "/",
      },
      {
        basePath: false,
        destination: "https://hraness.com/stripe/:path*",
        has: [{ type: "host", value: host }],
        permanent: true,
        source: "/:path*",
      },
    ]));
  });

  test("preserves data no-index rules under the generic Preview delivery contract", async () => {
    const identity = {
      VERCEL: "1",
      VERCEL_DEPLOYMENT_ID: "dpl_StripedexPreview123",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      VERCEL_PROJECT_ID: "prj_StripedexProject123",
      VERCEL_URL: "stripedex-git-example-hraness.vercel.app",
    } as const;
    const config = createNextConfig(identity);
    const headers = await config.headers?.();

    expect(headers).toContainEqual({
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/history/:category.yml",
    });
    expect(headers).toContainEqual({
      headers: [
        {
          key: PRODUCTION_DELIVERY_PROOF_HEADER,
          value: productionDeliveryProofToken({
            deploymentId: identity.VERCEL_DEPLOYMENT_ID,
            projectId: identity.VERCEL_PROJECT_ID,
            projectName: "stripedex",
            sha: identity.VERCEL_GIT_COMMIT_SHA,
          }),
        },
        { key: PREVIEW_ROBOTS_HEADER, value: PREVIEW_ROBOTS_POLICY },
      ],
      source: "/:path*",
    });
    expect(config.env?.[PREVIEW_NOTICE_ORIGIN_ENV]).toBe(
      "https://stripedex-git-example-hraness.vercel.app",
    );
  });
});
