import { createHash } from "node:crypto";

import { expect, test } from "bun:test";

const packageJson = await Bun.file(new URL("../package.json", import.meta.url)).json();
const globals = await Bun.file(new URL("./globals.css", import.meta.url)).text();
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

test("uses the released Nebula Sans default while retaining explicit mono roles", () => {
  expect(packageJson.dependencies).toMatchObject({
    "@hraness/design-kit": "github:hraness/design-kit#v0.2.1",
    "@hraness/ui": "github:hraness/ui#v0.4.10",
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.2.0",
  });
  expect(globals).toStartWith('@import "@hraness/design-kit/styles.css";');
  expect(tokens).toContain("--ui-font-sans: var(--font-text)");
  expect(tokens).toContain("--ui-font-heading: var(--ui-font-mono)");
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
