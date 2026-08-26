import type { NextConfig } from "next";
import {
  type ProductionDeliveryProofEnvironment,
  withProductionDeliveryProof,
} from "@hraness/vercel-delivery";

const nextConfig: NextConfig = {
  basePath: "/stripe",
  async headers() {
    const noindexHeaders = [{ key: "X-Robots-Tag", value: "noindex, follow" }];
    return [
      { headers: noindexHeaders, source: "/history/:category.yml" },
      { headers: noindexHeaders, source: "/research/:path*" },
      { headers: noindexHeaders, source: "/x-markdown" },
      { headers: noindexHeaders, source: "/x-markdown/:path*" },
      { headers: [{ key: "Vary", value: "Accept" }], source: "/" },
      { headers: [{ key: "Vary", value: "Accept" }], source: "/:path*" },
    ];
  },
  reactStrictMode: true,
  async redirects() {
    const canonicalOrigin = "https://hraness.com/stripe";
    const legacyHosts = [
      "stripedex.com",
      "www.stripedex.com",
      "stripehistory.com",
      "www.stripehistory.com",
      "stripe.town",
      "www.stripe.town",
      "stripe.guide",
      "www.stripe.guide",
    ];

    return [
      {
        destination: "/history/appearances",
        permanent: true,
        source: "/appearances",
      },
      ...legacyHosts.flatMap((host) => {
        const has = [{ type: "host" as const, value: host }];
        return [
          {
            destination: canonicalOrigin,
            has,
            permanent: true as const,
            source: "/history",
            basePath: false as const,
          },
          {
            destination: `${canonicalOrigin}/history/appearances`,
            has,
            permanent: true as const,
            source: "/appearances",
            basePath: false as const,
          },
          {
            destination: canonicalOrigin,
            has,
            permanent: true as const,
            source: "/",
            basePath: false as const,
          },
          {
            destination: `${canonicalOrigin}/:path*`,
            has,
            permanent: true as const,
            source: "/:path*",
            basePath: false as const,
          },
        ];
      }),
    ];
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export function createNextConfig(
  environment: ProductionDeliveryProofEnvironment = process.env,
): NextConfig {
  return withProductionDeliveryProof(nextConfig, {
    environment,
    projectName: "stripedex",
  });
}

export default createNextConfig();
