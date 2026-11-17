import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";
import * as stylex from "@stylexjs/stylex";
import { renderToStaticMarkup } from "react-dom/server";

import { siteLegacyStorageKey, siteModeMirrorKey, sitePalettePreference } from "@/support/appearance-config";
import { paletteMenuStyles } from "@/support/hraness/appearance-menu.stylex";
import { DesignPaletteProvider, ThemeMenuButton } from "@/support/theme";
import { SiteHeader } from "./site-header";

const menuRecipePath = fileURLToPath(new URL("../support/hraness/appearance-menu.stylex.ts", import.meta.url));
const { rules: menuRules } = await createStylexTransformCollector(process.cwd())
  .transform(await Bun.file(menuRecipePath).text(), menuRecipePath);
function menuCss(...recipes: readonly (typeof paletteMenuStyles)[keyof typeof paletteMenuStyles][]): string {
  const selected = new Set(stylex.props(recipes).className?.split(" "));
  return menuRules.filter(([name]) => selected.has(name)).map(([, rule]) => rule.ltr).join("\n");
}

test("the appearance trigger is rough.day's borderless round icon button", () => {
  const trigger = menuCss(paletteMenuStyles.trigger);
  expect(trigger).toContain("background-color:transparent");
  expect(trigger).toMatch(/border-(?:top-left-)?radius:999px/u);
  expect(trigger).toContain("border-color:transparent");
  expect(trigger).toMatch(/min-block-size:max\(2\.75rem, ?var\(--interactive-target-compact, ?2\.75rem\)\)/u);
  expect(trigger).toMatch(/:hover\{background-color:var\(--surface-hover, ?ButtonFace\)/u);
  expect(trigger).not.toContain("box-shadow");
  // The wash stays while the menu is open.
  const open = menuCss(paletteMenuStyles.trigger, paletteMenuStyles.triggerOpen);
  expect(open).toMatch(/\{background-color:var\(--surface-hover, ?ButtonFace\)/u);
  expect(open).not.toContain("background-color:transparent");
});

test("appearance starts with the Paper palette in System mode", () => {
  const html = renderToStaticMarkup(
    <DesignPaletteProvider
      defaultPreference={sitePalettePreference}
      legacyStorageKey={siteLegacyStorageKey}
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

test("Stripe History keeps one palette runtime shared by the bootstrap and the menu", async () => {
  const [source, bootstrap, layout, globalError] = await Promise.all([
    Bun.file(new URL("../support/theme.tsx", import.meta.url)).text(),
    Bun.file(new URL("../browser/theme-bootstrap.ts", import.meta.url)).text(),
    Bun.file(new URL("./layout.tsx", import.meta.url)).text(),
    Bun.file(new URL("./global-error.tsx", import.meta.url)).text(),
  ]);

  expect(sitePalettePreference).toEqual({ palette: "paper", mode: "system" });
  expect(siteLegacyStorageKey).toBe("stripe-history-theme-v1");
  expect(siteModeMirrorKey).toBe("hraness-theme");
  expect(source).toContain('from "./hraness/appearance-controller"');
  expect(source).not.toContain("localStorage");
  expect(source).not.toContain("MutationObserver");
  expect(bootstrap).toContain('from "../support/hraness/appearance-controller"');
  expect(bootstrap).toContain("defaultPreference: sitePalettePreference");
  expect(bootstrap).toContain("legacyStorageKey: siteLegacyStorageKey");
  // The bootstrap and the provider must agree, or the shared runtime refuses
  // the second configuration.
  expect(bootstrap).toContain("modeMirrorKey: siteModeMirrorKey");
  for (const page of [layout, globalError]) {
    expect(page).toContain("DesignPaletteProvider");
    expect(page).toContain("defaultPreference={sitePalettePreference}");
    expect(page).toContain("legacyStorageKey={siteLegacyStorageKey}");
    expect(page).toContain("modeMirrorKey={siteModeMirrorKey}");
    expect(page).toContain('data-palette="paper"');
    expect(page).not.toContain("@hraness/design-kit");
  }
  // The document is served under the `/stripe` base path behind hraness.com, and
  // Next.js leaves raw script URLs unprefixed. The bare root path resolves to the
  // hraness.com bootstrap, whose different palette configuration crashes the shared
  // palette runtime into the global error page.
  expect(layout).toContain('src="/stripe/theme-bootstrap.js"');
  expect(layout).not.toContain('src="/theme-bootstrap.js"');
});

test("compiled header native anchors retain /stripe and the selected about route", () => {
  const html = renderToStaticMarkup(<SiteHeader aboutSelected />);
  expect(html).toContain('href="/stripe"');
  expect(html).toContain('href="/stripe/data"');
  expect(html).toMatch(/<a aria-current="page" class="hraness-marketing-header__link [^"]+" href="\/stripe\/about">About<\/a>/u);
  expect(html).not.toContain('href="/about"');
  expect(html).not.toContain('href="/data"');
});
