import { expect, test } from "bun:test";
import { DesignThemeProvider } from "@hraness/design-kit/react";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeMenuButton } from "@/support/theme";
import { SiteHeader } from "./site-header";

test("appearance starts with System and keeps the existing product preference key", () => {
  const html = renderToStaticMarkup(
    <DesignThemeProvider storageKey="stripe-history-theme-v1">
      <ThemeMenuButton />
    </DesignThemeProvider>,
  );

  expect(html).toContain("stripe-history-theme-v1");
  expect(html).toContain('data-hraness-design-theme-guard=""');
  expect(html).toContain('data-theme-value="system"');
  expect(html).toContain('aria-label="Appearance: System"');
});

test("site chrome keeps the shared appearance menu as its final header action", () => {
  const html = renderToStaticMarkup(<SiteHeader />);
  const controlsStart = html.indexOf('class="stripe-history-header-controls"');
  const navigationEnd = html.indexOf("</nav>", controlsStart);
  const theme = html.indexOf('data-presentation="menu"', controlsStart);
  const controlsEnd = html.indexOf("</div>", theme);

  expect(html.match(/data-presentation="menu"/gu)).toHaveLength(1);
  expect(navigationEnd).toBeLessThan(theme);
  expect(html.slice(theme, controlsEnd)).not.toContain("<a ");
});

test("Stripe History does not keep a second theme runtime", async () => {
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
