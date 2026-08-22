"use client";

import {
  DesignThemeProvider,
  ThemeColorSync,
} from "@hraness/design-kit/react";
import type { RouteErrorPageProps } from "./error";
import "./globals.css";

export default function GlobalError({ reset }: RouteErrorPageProps) {
  return (
    <html data-theme="light" lang="en-US" suppressHydrationWarning>
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
        <DesignThemeProvider storageKey="stripe-history-theme-v1">
          <ThemeColorSync darkColor="#151515" lightColor="#ffffff" />
          <main className="plain-page stripedex-main stripedex-state" id="main-content">
            <h1>Stripedex is temporarily unavailable</h1>
            <p>The site could not finish loading.</p>
            <button onClick={reset} type="button">Try again</button>
          </main>
        </DesignThemeProvider>
      </body>
    </html>
  );
}
