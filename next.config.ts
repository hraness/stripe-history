import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      source: "/history/:category.yml",
    }];
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
};

export default nextConfig;
