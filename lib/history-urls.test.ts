import { describe, expect, test } from "bun:test";

import {
  historyCategoryPath,
  isMarkdownRewritePath,
  markdownRewritePath,
  publicPathFromMarkdownRewrite,
} from "./history-urls";

describe("history URL helpers", () => {
  test("builds durable category paths", () => {
    expect(historyCategoryPath("acquisitions")).toBe("/history/acquisitions");
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
