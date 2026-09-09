import { expect, test } from "bun:test";
import * as stylex from "@stylexjs/stylex";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryOrientation } from "./history/history-orientation";
import { orientationStyles } from "./history/history-orientation.stylex";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";
import { fileURLToPath } from "node:url";

test("compiled evidence slots bind four columns locally and retain rich Link/time semantics", () => {
  const html = renderToStaticMarkup(<HistoryOrientation evidence={{
    eventCount: 201, sourceLinkCount: 302, canonicalSourceCount: 103,
    latestCompletedResearchRunOn: "2026-09-09",
  }} />);
  const list = html.match(/<dl class="([^"]+)">/u);
  expect(list).not.toBeNull();
  for (const atom of stylex.props(orientationStyles.factColumns4).className!.split(" ")) {
    expect(list![1]!.split(" ")).toContain(atom);
  }
  expect(list![0]).not.toContain("style=");
  expect(html).toContain('<time dateTime="2026-09-09">');
  expect(html).toContain('href="/contact#corrections-and-sources">Report a correction</a>');
  expect(html).toMatch(/<details class="history-source-details [^"]+"><summary class="[^"]+">Sources and review<\/summary>/u);
  expect(html).not.toMatch(/<details[^>]*\bopen(?:[\s=>])/u);
  expect(html).toContain('href="#timeline">Browse the timeline</a>');
  expect(html).toContain('href="/data">Download the data</a>');
  expect(html).toContain('href="/about#sources-and-review">Method and limits</a>');
  expect(html).toContain("does not claim that every timeline category was re-reviewed");
});

test("compact orientation and source disclosure use compiled geometry without raw overrides", async () => {
  const path = fileURLToPath(new URL("./history/history-orientation.stylex.ts", import.meta.url));
  const { rules } = await createStylexTransformCollector(process.cwd()).transform(await Bun.file(path).text(), path);
  function css(style: (typeof orientationStyles)[keyof typeof orientationStyles]) {
    const classes = new Set(stylex.props(style).className!.split(" "));
    return rules.filter(([name]) => classes.has(name)).map(([, rule]) => rule.ltr).join("\n");
  }
  expect(css(orientationStyles.hero__copy)).toContain("justify-items:start");
  expect(css(orientationStyles.hero__copy)).toContain("text-align:start");
  expect(css(orientationStyles.hero__heading)).toContain("font-size:clamp(1.8rem,4vw,2.6rem)");
  expect(css(orientationStyles.sourceSummary)).toContain("min-height:2.75rem");
  expect(css(orientationStyles.sourceSummary)).toContain(":focus-visible");
  const globals = await Bun.file(new URL("./globals.css", import.meta.url)).text();
  expect(globals).not.toContain(".history-orientation {");
  expect(globals).not.toContain(".stripe-history-main .hraness-marketing-hero__heading {");
});
