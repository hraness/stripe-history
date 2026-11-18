"use client";

import { siteLegacyStorageKey, siteModeMirrorKey, sitePalettePreference } from "@/support/appearance-config";
import { designPaletteClassName } from "@/support/hraness/appearance";
import { DesignPaletteProvider } from "@/support/theme";
import type { RouteErrorPageProps } from "./error";
import "@hraness/ui/compiler-foundation.css";
import "../support/hraness/foundation.css";
import "./globals.css";


export default function GlobalError({ reset }: RouteErrorPageProps) {
  return (
    <html
      className={designPaletteClassName}
      data-palette="paper"
      lang="en-US"
      suppressHydrationWarning
    >
      <head>
        <meta content="light dark" name="color-scheme" />
        <meta
          content="#f4f1ea"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#141311"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
      </head>
      <body className="plain-site">
        <DesignPaletteProvider
          defaultPreference={sitePalettePreference}
          legacyStorageKey={siteLegacyStorageKey}
          modeMirrorKey={siteModeMirrorKey}
        >
          <main className="plain-page stripe-history-main stripe-history-state" id="main-content">
            <h1>Stripe History is temporarily unavailable</h1>
            <p>The site could not finish loading.</p>
            <button onClick={reset} type="button">Try again</button>
          </main>
        </DesignPaletteProvider>
      </body>
    </html>
  );
}
