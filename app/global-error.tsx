"use client";

import { getDesignPaletteTheme } from "@hraness/design-kit";
import {
  DesignPaletteProvider,
  ThemeColorSync,
} from "@hraness/design-kit/react";
import type { RouteErrorPageProps } from "./error";
import "@hraness/ui/compiler-foundation.css";
import "@hraness/design-kit/compiler-foundation.css";
import "@hraness/site-footer/compiler-foundation.css";
import "./globals.css";

const initialPalette = getDesignPaletteTheme("paper", "light");

export default function GlobalError({ reset }: RouteErrorPageProps) {
  return (
    <html
      className={initialPalette.className}
      data-palette="paper"
      lang="en-US"
      suppressHydrationWarning
    >
      <head>
        <meta content="light dark" name="color-scheme" />
        <meta
          content="#ffffff"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#151515"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
      </head>
      <body className="plain-site">
        <DesignPaletteProvider
          defaultPreference={{ palette: "paper", mode: "system" }}
          legacyStorageKey="stripe-history-theme-v1"
        >
          <ThemeColorSync darkColor="#151515" lightColor="#ffffff" />
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
