import { expect, test } from "bun:test";
import { DesignThemeProvider } from "@hraness/design-kit/react";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeToggle } from "@/support/theme";

test("appearance starts with System and keeps the existing product preference key", () => {
  const html = renderToStaticMarkup(
    <DesignThemeProvider storageKey="stripe-history-theme-v1">
      <ThemeToggle />
    </DesignThemeProvider>,
  );

  expect(html).toContain("stripe-history-theme-v1");
  expect(html).toContain('data-hraness-design-theme-guard=""');
  expect(html).toContain('data-theme-value="system"');
  expect(html).toContain('aria-label="Appearance: System"');
});

test("Stripedex does not keep a second theme runtime", async () => {
  const [source, layout, globalError] = await Promise.all([
    Bun.file(new URL("../support/theme.tsx", import.meta.url)).text(),
    Bun.file(new URL("./layout.tsx", import.meta.url)).text(),
    Bun.file(new URL("./global-error.tsx", import.meta.url)).text(),
  ]);

  expect(source).toContain('from "@hraness/design-kit/react"');
  expect(source).not.toContain("localStorage");
  expect(source).not.toContain("MutationObserver");
  expect(source).not.toContain("useSyncExternalStore");
  expect(layout).toContain(
    '<DesignThemeProvider storageKey="stripe-history-theme-v1">',
  );
  expect(globalError).toContain(
    '<DesignThemeProvider storageKey="stripe-history-theme-v1">',
  );
});
