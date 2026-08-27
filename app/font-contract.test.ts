import { expect, test } from "bun:test";

const packageJson = await Bun.file(new URL("../package.json", import.meta.url)).json();
const globals = await Bun.file(new URL("./globals.css", import.meta.url)).text();
const tokens = await Bun.file(new URL("../support/tokens.css", import.meta.url)).text();
const styles = await Bun.file(new URL("../support/styles.css", import.meta.url)).text();
const plainSite = await Bun.file(new URL("../support/plain-site.css", import.meta.url)).text();
const socialImage = await Bun.file(new URL("./opengraph-image.tsx", import.meta.url)).text();
const darkWordmark = await Bun.file(new URL("../assets/hraness-wordmark-dark.svg", import.meta.url)).text();

test("uses the released Nebula Sans default while retaining explicit mono roles", () => {
  expect(packageJson.dependencies).toMatchObject({
    "@hraness/design-kit": "github:hraness/design-kit#v0.2.1",
    "@hraness/ui": "github:hraness/ui#v0.4.7",
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.2.0",
  });
  expect(globals).toStartWith('@import "@hraness/design-kit/styles.css";');
  expect(tokens).toContain("--ui-font-sans: var(--font-text)");
  expect(tokens).toContain("--ui-font-heading: var(--ui-font-mono)");
  expect(styles).not.toContain("--font-text: Arial");
  expect(plainSite).toContain("font-family: var(--font-text)");
  expect(socialImage).toContain('fontFamily: "Nebula Sans"');
  expect(socialImage).toContain("fonts: [...nebulaSansSocialFonts()]");
  expect(darkWordmark).toContain("'Nebula Sans', sans-serif");
});
