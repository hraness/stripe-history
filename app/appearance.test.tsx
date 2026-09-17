import { expect, test } from "bun:test";
import { DesignPaletteProvider } from "@hraness/design-kit/react";
import { renderToStaticMarkup } from "react-dom/server";

import { ThemeMenuButton } from "@/support/theme";
import { SiteHeader } from "./site-header";

test("appearance starts with the Paper palette in System mode", () => {
  const html = renderToStaticMarkup(
    <DesignPaletteProvider
      defaultPreference={{ palette: "paper", mode: "system" }}
      legacyStorageKey="stripe-history-theme-v1"
    >
      <ThemeMenuButton />
    </DesignPaletteProvider>,
  );

  expect(html).toContain('aria-label="Appearance: Paper, System"');
});

test("site chrome keeps the shared appearance menu as its final header action", () => {
  const html = renderToStaticMarkup(<SiteHeader />);
  const controlsStart = html.indexOf('class="hraness-marketing-header__inner ');
  expect(controlsStart).toBeGreaterThan(-1);
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
  for (const page of [layout, globalError]) {
    expect(page).toContain("DesignPaletteProvider");
    expect(page).toContain('legacyStorageKey="stripe-history-theme-v1"');
    expect(page).toContain('data-palette="paper"');
    expect(page).not.toContain("DesignThemeProvider");
  }
  expect(layout).toContain('src="/theme-bootstrap.js"');
});

test("compiled header native anchors retain /stripe and the selected about route", () => {
  const html = renderToStaticMarkup(<SiteHeader aboutSelected />);
  expect(html).toContain('href="/stripe"');
  expect(html).toContain('href="/stripe/data"');
  expect(html).toMatch(/<a aria-current="page" class="hraness-marketing-header__link [^"]+" href="\/stripe\/about">about<\/a>/u);
  expect(html).not.toContain('href="/about"');
  expect(html).not.toContain('href="/data"');
});
