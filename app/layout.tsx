import { siteThemes } from "@/support/design-kit";
import { getDesignPaletteTheme } from "@hraness/design-kit";
import {
  DesignPaletteProvider,
  ThemeColorSync,
} from "@hraness/design-kit/react";
import { SkipLink } from "@/support/theme";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@hraness/ui/compiler-foundation.css";
import "@hraness/design-kit/compiler-foundation.css";
import "@hraness/site-footer/compiler-foundation.css";
import "./globals.css";
import "./material.css";
import { FoilController } from "./foil-controller";
import { PostHogAnalytics } from "./posthog-analytics";
import { siteOrganizationJsonLd, websiteJsonLd } from "./seo";
import { absoluteSiteUrl, SITE_HOST_ORIGIN, site } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_HOST_ORIGIN),
  title: {
    default: site.applicationName,
    template: site.titleTemplate,
  },
  applicationName: site.applicationName,
  formatDetection: { address: false, email: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.name,
    images: [{
      alt: site.socialImageAlt,
      height: 630,
      url: absoluteSiteUrl("/opengraph-image"),
      width: 1200,
    }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ alt: site.socialImageAlt, url: absoluteSiteUrl("/opengraph-image") }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#151515", media: "(prefers-color-scheme: dark)" },
  ],
};

/**
 * Paper is the default palette; the initial class supplies its compiled
 * values and the blocking bootstrap adds a concrete `data-theme` before
 * paint. With JavaScript disabled no `data-theme` is rendered, so the
 * light defaults in `globals.css` keep the page readable.
 */
const initialPalette = getDesignPaletteTheme("paper", "light");

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={initialPalette.className}
      data-palette="paper"
      lang="en-US"
      suppressHydrationWarning
    >
      <head>
        {/* The blocking external bootstrap applies a saved palette before first paint.
            Next.js does not prefix raw script URLs with `basePath`, so the path carries
            `/stripe` explicitly; the bare `/theme-bootstrap.js` is hraness.com's own
            bootstrap, whose different palette configuration makes the shared runtime
            throw and the whole document fall to the global error page. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/stripe/theme-bootstrap.js" />
      </head>
      <body className={siteThemes.plain.bodyClassName} data-hraness-material="lantern">
        <JsonLdScript
          data={[websiteJsonLd(), siteOrganizationJsonLd()]}
          id="stripe-history-website-structured-data"
        />
        <PostHogAnalytics
          apiHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
        />
        <DesignPaletteProvider
          defaultPreference={{ palette: "paper", mode: "system" }}
          legacyStorageKey="stripe-history-theme-v1"
        >
          <ThemeColorSync darkColor="#151515" lightColor="#ffffff" />
          <SkipLink href="#main-content">Skip to content</SkipLink>
          {children}
          <FoilController />
        </DesignPaletteProvider>
      </body>
    </html>
  );
}
