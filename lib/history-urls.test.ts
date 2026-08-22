import { describe, expect, test } from "bun:test";

import {
  historyCategoryPath,
  historyEventPath,
  isMarkdownRewritePath,
  markdownRewritePath,
  parseHistoryEventPath,
  publicPathFromMarkdownRewrite,
} from "./history-urls";

describe("history URL helpers", () => {
  test("builds durable category and event paths", () => {
    expect(historyCategoryPath("acquisitions")).toBe("/history/acquisitions");
    expect(historyEventPath(
      "acquisitions",
      "openrouter-acquisition-talks-reported",
    )).toBe("/history/acquisitions/openrouter-acquisition-talks-reported");
  });

  test("parses only real category and event identity pairs", () => {
    expect(parseHistoryEventPath(
      "/history/acquisitions/openrouter-acquisition-talks-reported",
    )).toEqual({
      categoryId: "acquisitions",
      eventId: "openrouter-acquisition-talks-reported",
    });
    expect(parseHistoryEventPath("/history/payment-volume/not-an-event")).toBeNull();
    expect(parseHistoryEventPath("/history/acquisitions")).toBeNull();
    expect(parseHistoryEventPath("/history/acquisitions/Not-Valid")).toBeNull();
    expect(parseHistoryEventPath("/history/acquisitions/one/two")).toBeNull();
  });

  test("maps public document paths onto the internal markdown rewrite", () => {
    expect(markdownRewritePath("/")).toBe("/x-markdown");
    expect(markdownRewritePath("/about")).toBe("/x-markdown/about");
    expect(markdownRewritePath("/history/acquisitions")).toBe(
      "/x-markdown/history/acquisitions",
    );
    expect(isMarkdownRewritePath("/x-markdown")).toBe(true);
    expect(isMarkdownRewritePath("/x-markdown/about")).toBe(true);
    expect(isMarkdownRewritePath("/about")).toBe(false);
    expect(publicPathFromMarkdownRewrite("/x-markdown")).toBe("/");
    expect(publicPathFromMarkdownRewrite("/x-markdown/history/acquisitions")).toBe(
      "/history/acquisitions",
    );
    expect(publicPathFromMarkdownRewrite("/about")).toBeNull();
  });
});
