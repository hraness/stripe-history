import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants.js";
import { withStylexNext } from "@hraness/ui/stylex-build/next";
import { stylexOptions } from "./stylex-config.ts";
import {
  type ProductionDeliveryProofEnvironment,
  withProductionDeliveryProof,
} from "@hraness/vercel-delivery";

const nextConfig = {
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
} satisfies NextConfig;

export function createNextConfig(
  environment: ProductionDeliveryProofEnvironment = process.env,
): NextConfig {
  return withProductionDeliveryProof(nextConfig, {
    environment,
    projectName: "stripe-history",
  });
}

export default function configForPhase(phase: string): NextConfig {
  const config = createNextConfig();
  if (phase === PHASE_PRODUCTION_SERVER) return config;
  if (phase !== PHASE_PRODUCTION_BUILD) {
    throw new Error("Stripe History uses compiled preview: run bun run dev; next dev/HMR is unsupported.");
  }
  // The delivery wrapper changes headers/env only. Keep the concrete synchronous
  // callback type and reject a future wrapper that silently replaces it.
  if (config.webpack !== nextConfig.webpack) throw new Error("Delivery wrapper replaced the product webpack callback");
  return withStylexNext({ ...config, webpack: nextConfig.webpack }, stylexOptions(process.cwd()));
}
