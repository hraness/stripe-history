import { createHash } from "node:crypto";

import { expect, test } from "bun:test";

const packageJson = await Bun.file(new URL("../package.json", import.meta.url)).json();
const globals = await Bun.file(new URL("./globals.css", import.meta.url)).text();
const layout = await Bun.file(new URL("./layout.tsx", import.meta.url)).text();
const tokens = await Bun.file(new URL("../support/tokens.css", import.meta.url)).text();
const styles = await Bun.file(new URL("../support/styles.css", import.meta.url)).text();
const plainSite = await Bun.file(new URL("../support/plain-site.css", import.meta.url)).text();
const socialImage = await Bun.file(new URL("./opengraph-image.tsx", import.meta.url)).text();
const darkWordmark = await Bun.file(new URL("../assets/hraness-wordmark-dark.svg", import.meta.url)).text();
const lightWordmark = await Bun.file(new URL("../assets/hraness-wordmark-light.svg", import.meta.url)).text();

function outlinedWordmark(svg: string): string {
  expect(svg).not.toMatch(/<text\b|font-family=/u);
  const path = svg.match(/<path data-wordmark="hraness" d="([^"]+)"/u)?.[1];
  expect(path).toBeDefined();
  if (path === undefined) throw new Error("Hraness wordmark outline is missing");
  return path;
}

test("uses the released Nebula Sans default for text and headings while retaining explicit mono roles", () => {
  expect(packageJson.dependencies).toMatchObject({
    "@hraness/design-kit": "github:hraness/design-kit#v0.6.2",
    "@hraness/ui": "github:hraness/ui#v0.5.10",
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.2.0",
  });
  expect(layout).toContain('import "@hraness/ui/compiler-foundation.css";');
  expect(layout).toContain('import "@hraness/design-kit/compiler-foundation.css";');
  expect(layout).toContain('import "@hraness/site-footer/compiler-foundation.css";');
  expect(globals).not.toMatch(/@hraness\/[^"\n]+\/(?:styles|stylex)\.css/u);
  expect(tokens).toContain("--ui-font-sans: var(--font-text)");
  expect(tokens).toContain("--ui-font-heading: var(--font-text)");
  expect(styles).toContain("--font-heading: var(--font-text)");
  expect(styles).toContain("--font-mono: ui-monospace");
  expect(styles).not.toContain("--font-text: Arial");
  expect(plainSite).toContain("font-family: var(--font-text)");
  expect(socialImage).toContain('fontFamily: "Nebula Sans"');
  expect(socialImage).toContain("fonts: [...nebulaSansSocialFonts()]");
});

test("outlines the README wordmark without depending on an installed font", () => {
  const darkOutline = outlinedWordmark(darkWordmark);
  const lightOutline = outlinedWordmark(lightWordmark);

  expect(lightOutline).toBe(darkOutline);
  expect(createHash("sha256").update(darkOutline).digest("hex")).toBe(
    "8d2788606aa414b371d23f678042b2b155f9284059cc88184c5c47b80713e311",
  );
});
