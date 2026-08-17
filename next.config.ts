import type { NextConfig } from "next";
import {
  type ProductionDeliveryProofEnvironment,
  withProductionDeliveryProof,
} from "@hraness/vercel-delivery";

const nextConfig: NextConfig = {
  async headers() {
    const noindexHeaders = [{ key: "X-Robots-Tag", value: "noindex, follow" }];
    return [
      { headers: noindexHeaders, source: "/history/:category.yml" },
      { headers: noindexHeaders, source: "/research/:path*" },
    ];
  },
  reactStrictMode: true,
  async redirects() {
    const canonicalOrigin = "https://stripehistory.com";
    const legacyHosts = ["stripe.town", "www.stripehistory.com"];

    return legacyHosts.flatMap((host) => {
      const has = [{ type: "host" as const, value: host }];
      return [
        {
          destination: canonicalOrigin,
          has,
          permanent: true,
          source: "/history",
        },
        {
          destination: `${canonicalOrigin}/:path*`,
          has,
          permanent: true,
          source: "/:path*",
        },
      ];
    });
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
    projectName: "stripe-history",
  });
}

export default createNextConfig();
