import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorPage from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";

describe("standalone runtime surfaces", () => {
  test("starts the shared Hraness analytics client from the layout without build-time keys", async () => {
    const layoutSource = await readFile(new URL("./layout.tsx", import.meta.url), "utf8");
    const clientSource = await readFile(new URL("./analytics-client.tsx", import.meta.url), "utf8");

    expect(layoutSource).toContain("<SiteAnalytics />");
    expect(layoutSource).not.toContain("NEXT_PUBLIC_POSTHOG");
    expect(clientSource.startsWith('"use client";')).toBe(true);
    expect(clientSource).toContain('import("@hraness/analytics/browser")');
    expect(clientSource).not.toContain('from "@hraness/analytics/browser";\nimport { createAnalytics');
  });

  test("renders route and document failures without private telemetry", () => {
    const route = renderToStaticMarkup(
      <ErrorPage error={new Error("fixture")} reset={() => undefined} />,
    );
    const document = renderToStaticMarkup(
      <GlobalError error={new Error("fixture")} reset={() => undefined} />,
    );

    expect(route).toContain("Something went wrong");
    expect(route).toContain("Try again");
    expect(document).toContain("Stripe History is temporarily unavailable");
    expect(document).toContain('<meta content="light dark" name="color-scheme"/>');
    expect(document).toContain(
      '<meta content="#f4f1ea" media="(prefers-color-scheme: light)" name="theme-color"/>',
    );
    expect(document).toContain(
      '<meta content="#141311" media="(prefers-color-scheme: dark)" name="theme-color"/>',
    );
    expect(`${route}${document}`).not.toContain("hraness-design-theme-toggle");
    expect(`${route}${document}`).not.toContain("PostHog");
  });

  test("does not ship a root loading shell that can replace history HTML", () => {
    expect(existsSync(fileURLToPath(new URL("./loading.tsx", import.meta.url)))).toBe(
      false,
    );
  });

  test("renders not-found states with useful navigation", () => {
    const notFound = renderToStaticMarkup(<NotFound />);

    expect(notFound).toContain("Page not found");
    expect(notFound).toContain('href="/"');
    expect(notFound).toContain('href="/llms.txt"');
    expect(notFound).toContain('href="/sitemap.xml"');
    expect(notFound).toContain('href="/about"');
    expect(notFound).toContain('href="/contact"');
    expect(notFound).toContain('href="/privacy"');
    expect(notFound.match(/data-presentation="menu"/gu)).toHaveLength(1);
    expect(notFound).toContain('aria-label="Stripe History home"');
  });
});
