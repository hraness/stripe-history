import { describe, expect, test } from "bun:test";
import { loadHistory } from "./content";

import { MARKDOWN_CONTENT_TYPE, markdownForPath, notFoundMarkdown } from "./page-markdown";
import { llmsTxt } from "./llms-txt";

function visibleText(markdown: string): string {
  return markdown.replace(/[#>*`\[\]()]/gu, " ").replace(/\s+/gu, " ").trim();
}

describe("agent markdown representations", () => {
  test("returns recovery markdown for unknown paths", async () => {
    const missing = await markdownForPath("/some-path-that-does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body).toBe(notFoundMarkdown());
    expect(missing.body).toContain("# Page not found");
    expect(missing.body).toContain("https://stripedex.com/llms.txt");
    expect(missing.body).toContain("https://stripedex.com/sitemap.xml");
    expect(missing.body).toContain("https://stripedex.com/about");
    expect(MARKDOWN_CONTENT_TYPE).toBe("text/markdown; charset=utf-8");
  });

  test("renders the homepage as an index instead of the full HTML timeline", async () => {
    const history = await loadHistory();
    const page = await markdownForPath("/");
    expect(page.status).toBe(200);
    expect(page.body).toContain(`# Stripe Company History: ${history.events.length} Sourced Events`);
    expect(page.body).toContain("not affiliated with, endorsed by, or operated by");
    expect(page.body).toContain("https://stripedex.com/history/acquisitions");
    expect(page.body).toContain("## Recent events");
    expect(page.body).toContain(history.events[0]?.title ?? "missing-event");
    expect(page.body).toContain(
      `https://stripedex.com/history/${history.events[0]?.categoryId}/${history.events[0]?.id}`,
    );
    expect(page.body).not.toContain(history.events.at(-1)?.title ?? "missing-oldest");
  });

  test("renders a durable event page from the same sourced record", async () => {
    const page = await markdownForPath(
      "/history/acquisitions/openrouter-acquisition-talks-reported",
    );
    expect(page.status).toBe(200);
    expect(page.body).toContain("Stripe reportedly discusses acquiring OpenRouter");
    expect(page.body).toContain("not affiliated with, endorsed by, or operated by");
    expect(page.body).toContain("https://stripedex.com/history/acquisitions");
    expect((await markdownForPath("/history/acquisitions/not-a-real-event")).status)
      .toBe(404);
  });

  test("renders category, volume, about, contact, and privacy pages from the same records", async () => {
    const history = await loadHistory();
    const acquisitions = history.events.find(({ categoryId }) => categoryId === "acquisitions");
    const category = await markdownForPath("/history/acquisitions");
    expect(category.status).toBe(200);
    expect(category.body).toContain(acquisitions?.title ?? "missing-acquisition");
    expect(category.body).toContain("Sources:");

    const volume = await markdownForPath("/history/payment-volume");
    expect(volume.body).toContain("2025");
    expect(volume.body).toContain("total volume");

    const about = await markdownForPath("/about");
    expect(about.body).toContain("founder side projects and aesthetics programs");
    expect(visibleText((await markdownForPath("/privacy")).body).length).toBeGreaterThan(500);
    expect(visibleText((await markdownForPath("/contact")).body).length).toBeGreaterThan(500);
  });
});

describe("llms.txt", () => {
  test("names when to use Stripedex and when not to", async () => {
    const body = await llmsTxt();
    expect(body.startsWith("# Stripedex\n> ")).toBe(true);
    expect(body).toContain("## When to use this");
    expect(body).toContain("Do not use Stripedex for Stripe product APIs");
    expect(body).toContain("https://stripedex.com/about");
    expect(body).toContain("https://stripedex.com/data");
    expect(body).toContain("https://stripedex.com/history/appearances");
    expect(body).not.toContain("openapi");
    expect(body).not.toContain("MCP server");
  });
});
