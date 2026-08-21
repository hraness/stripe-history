import { siteThemes } from "@/support/design-kit";
import {
  DesignThemeProvider,
  ThemeColorSync,
} from "@hraness/design-kit/react";
import { SkipLink } from "@/support/theme";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PostHogAnalytics } from "./posthog-analytics";
import { siteOrganizationJsonLd, websiteJsonLd } from "./seo";
import { SITE_ORIGIN, site } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
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
      url: "/opengraph-image",
      width: 1200,
    }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ alt: site.socialImageAlt, url: "/opengraph-image" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#151515", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-theme="light" lang="en-US" suppressHydrationWarning>
      <body className={siteThemes.plain.bodyClassName}>
        <JsonLdScript
          data={[websiteJsonLd(), siteOrganizationJsonLd()]}
          id="stripedex-website-structured-data"
        />
        <PostHogAnalytics
          apiHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
        />
        <DesignThemeProvider storageKey="stripe-history-theme-v1">
          <ThemeColorSync darkColor="#151515" lightColor="#ffffff" />
          <SkipLink href="#main-content">Skip to content</SkipLink>
          {children}
        </DesignThemeProvider>
      </body>
    </html>
  );
}
