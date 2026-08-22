import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorPage from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";

describe("standalone runtime surfaces", () => {
  test("loads the privacy-bounded PostHog provider from public environment values", async () => {
    const layoutSource = await readFile(new URL("./layout.tsx", import.meta.url), "utf8");
    const posthogSource = await readFile(new URL("./posthog.ts", import.meta.url), "utf8");

    expect(layoutSource).toContain("PostHogAnalytics");
    expect(layoutSource).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(layoutSource).toContain("NEXT_PUBLIC_POSTHOG_HOST");
    expect(posthogSource).toContain('import("posthog-js")');
    expect(posthogSource).not.toContain('import posthog from "posthog-js"');
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
    expect(document).toContain("Stripedex is temporarily unavailable");
    expect(document).toContain('<meta content="light dark" name="color-scheme"/>');
    expect(document).toContain(
      '<meta content="#ffffff" media="(prefers-color-scheme: light)" name="theme-color"/>',
    );
    expect(document).toContain(
      '<meta content="#151515" media="(prefers-color-scheme: dark)" name="theme-color"/>',
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
    expect(notFound).toContain('aria-label="hraness"');
  });
});
