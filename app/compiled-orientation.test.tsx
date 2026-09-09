import { expect, test } from "bun:test";
import * as stylex from "@stylexjs/stylex";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryOrientation } from "./history/history-orientation";
import { orientationStyles } from "./history/history-orientation.stylex";

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
});
