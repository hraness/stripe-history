import { expect, test } from "bun:test";
import * as stylex from "@stylexjs/stylex";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryOrientation } from "./history/history-orientation";
import { orientationStyles } from "./history/history-orientation.stylex";
import { HistoryClosing } from "./history/history-closing";
import { closingStyles } from "./history/history-closing.stylex";
import { SiteFooter } from "./site-footer";
import { footerStyles } from "./site-footer.stylex";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";
import { fileURLToPath } from "node:url";

test("the root introduction is a plain title, one line, and quiet disclosure lines", () => {
  const html = renderToStaticMarkup(<HistoryOrientation afterHero={<p id="after">facts</p>} />);
  expect(html).toContain('id="history-heading">Stripe History</h1>');
  expect(html).toContain("Every event in Stripe&#x27;s history, dated and sourced.");
  expect(html).toContain("Drafted with AI assistance.");
  expect(html).toContain("Not affiliated with, endorsed by, or operated by Stripe, Inc.");
  expect(html).toContain('href="/contact#corrections-and-sources">Report a correction</a>');
  expect(html).not.toContain("hraness-marketing-hero__eyebrow");
  expect(html).not.toContain("hraness-marketing-action");
  expect(html).not.toContain("<details");
  expect(html.indexOf('id="after"')).toBeGreaterThan(html.indexOf("Report a correction"));
});

test("the introduction uses compiled start-aligned geometry without raw overrides", async () => {
  const path = fileURLToPath(new URL("./history/history-orientation.stylex.ts", import.meta.url));
  const { rules } = await createStylexTransformCollector(process.cwd()).transform(await Bun.file(path).text(), path);
  function css(style: (typeof orientationStyles)[keyof typeof orientationStyles]) {
    const classes = new Set(stylex.props(style).className!.split(" "));
    return rules.filter(([name]) => classes.has(name)).map(([, rule]) => rule.ltr).join("\n");
  }
  expect(css(orientationStyles.hero)).not.toContain("text-align:center");
  expect(css(orientationStyles.hero__heading)).toContain("font-size:clamp(2.25rem,6vw,3.25rem)");
  expect(css(orientationStyles.hero__boundary)).toContain("font-size:.8125rem");
  const globals = await Bun.file(new URL("./globals.css", import.meta.url)).text();
  expect(globals).not.toContain(".history-orientation {");
  expect(globals).not.toContain(".stripe-history-main .hraness-marketing-hero__heading {");
});

test("closing and resource borders bind supported longhands to the rendered elements", async () => {
  for (const { file, markup, styles, color } of [
    {
      file: "./history/history-closing.stylex.ts",
      markup: renderToStaticMarkup(<HistoryClosing />),
      styles: [closingStyles.section, closingStyles.question],
      color: "var(--hraness-marketing-line)",
    },
    {
      file: "./site-footer.stylex.ts",
      markup: renderToStaticMarkup(<SiteFooter />),
      styles: [footerStyles.root],
      color: "var(--plain-line)",
    },
  ]) {
    const path = fileURLToPath(new URL(file, import.meta.url));
    const { rules } = await createStylexTransformCollector(process.cwd()).transform(await Bun.file(path).text(), path);
    for (const style of styles) {
      const className = stylex.props(style).className!;
      expect(markup).toContain(className);
      const names = new Set(className.split(" "));
      const css = rules.filter(([name]) => names.has(name)).map(([, rule]) => rule.ltr).join("\n");
      expect(css).toContain("border-top-width:1px");
      expect(css).toContain("border-top-style:solid");
      expect(css).toContain(`border-top-color:${color}`);
    }
  }
});
