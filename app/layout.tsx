import { siteThemes } from "@/support/design-kit";
import {
  DesignThemeProvider,
  SkipLink,
  ThemeColorSync,
} from "@/support/theme";
import { INDEXABLE_ROBOTS } from "@/support/discovery";
import { JsonLdScript } from "@/support/json-ld";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { websiteJsonLd } from "./seo";
import { SITE_ORIGIN, site, socialMetadata } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: site.title,
    template: site.titleTemplate,
  },
  description: site.description,
  applicationName: site.applicationName,
  alternates: {
    canonical: "/",
  },
  formatDetection: { address: false, email: false, telephone: false },
  robots: INDEXABLE_ROBOTS,
  ...socialMetadata(site.title, site.description, "/"),
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-theme="light" lang="en-US" suppressHydrationWarning>
      <body className={siteThemes.plain.bodyClassName}>
        <JsonLdScript data={websiteJsonLd()} id="stripe-history-website-structured-data" />
        <DesignThemeProvider storageKey="stripe-history-theme-v1">
          <ThemeColorSync darkColor="#151515" lightColor="#ffffff" />
          <SkipLink href="#main-content">Skip to content</SkipLink>
          {children}
        </DesignThemeProvider>
      </body>
    </html>
  );
}
