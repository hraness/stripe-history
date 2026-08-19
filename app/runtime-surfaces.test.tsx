import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorPage from "./error";
import GlobalError from "./global-error";
import Loading from "./loading";
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
    expect(document).toContain("Stripe History is temporarily unavailable");
    expect(`${route}${document}`).not.toContain("PostHog");
  });

  test("renders loading and not-found states with useful navigation", () => {
    const loading = renderToStaticMarkup(<Loading />);
    const notFound = renderToStaticMarkup(<NotFound />);

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('role="status"');
    expect(notFound).toContain("Page not found");
    expect(notFound).toContain('href="/"');
    expect(notFound).toContain('aria-label="hraness"');
  });
});
