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
    expect(missing.body).toContain("https://hraness.com/stripe/llms.txt");
    expect(missing.body).toContain("https://hraness.com/stripe/sitemap.xml");
    expect(missing.body).toContain("https://hraness.com/stripe/about");
    expect(MARKDOWN_CONTENT_TYPE).toBe("text/markdown; charset=utf-8");
  });

  test("renders the homepage as an index instead of the full HTML timeline", async () => {
    const history = await loadHistory();
    const page = await markdownForPath("/");
    expect(page.status).toBe(200);
    expect(page.body).toContain(`# Stripe Company History: ${history.events.length} Sourced Events`);
    expect(page.body).toContain("not affiliated with, endorsed by, or operated by");
    expect(page.body).toContain("https://hraness.com/stripe/history/acquisitions");
    expect(page.body).not.toContain(history.events[0]?.title ?? "missing-event");
    expect(page.body).not.toContain("/history/acquisitions/openrouter-acquisition-talks-reported");
  });

  test("treats invented per-event routes as missing pages", async () => {
    expect((await markdownForPath(
      "/history/acquisitions/openrouter-acquisition-talks-reported",
    )).status).toBe(404);
  });

  test("renders category, volume, about, contact, and privacy pages from the same records", async () => {
    const history = await loadHistory();
    const acquisitions = history.events.find(({ categoryId }) => categoryId === "acquisitions");
    const category = await markdownForPath("/history/acquisitions");
    expect(category.status).toBe(200);
    expect(category.body).toContain(acquisitions?.title ?? "missing-acquisition");
    expect(category.body).toContain("Sources:");

    const volume = await markdownForPath("/history/payment-volume");
    expect(volume.status).toBe(200);
    expect(volume.body).toContain("| year | volume | kind | qualifier | sources |");
    expect(volume.body).toContain("| 2025 | $1.9 trillion | total volume | published value |");
    expect(volume.body).toContain("| 2021 | $640 billion+ | payment volume | lower bound |");
    expect(volume.body).toContain("Stripe reports $1.9 trillion in 2025 total volume");
    expect(volume.body).toContain("not affiliated with, endorsed by, or operated by");

    const valuation = await markdownForPath("/history/valuation");
    expect(valuation.status).toBe(200);
    expect(valuation.body).toContain("| year | valuation | basis | status | sources |");
    expect(valuation.body).toContain("$159 billion");
    expect(valuation.body).toContain("transaction implied");
    expect(valuation.body).toContain("not affiliated with, endorsed by, or operated by");

    const about = await markdownForPath("/about");
    expect(about.body).toContain("founder side projects and aesthetics programs");
    expect(about.body).toContain("## Publications followed");
    expect(about.body).toContain("https://www.stripeeconomics.com/");
    expect(about.body).toContain("https://www.worksinprogress.news/");
    const data = await markdownForPath("/data");
    expect(data.body).toContain("## Publications followed");
    expect(data.body).toContain("[Stripe Economics](https://www.stripeeconomics.com/)");
    expect(visibleText((await markdownForPath("/privacy")).body).length).toBeGreaterThan(500);
    expect(visibleText((await markdownForPath("/contact")).body).length).toBeGreaterThan(500);
  });
});

describe("llms.txt", () => {
  test("names when to use Stripe History and when not to", async () => {
    const body = await llmsTxt();
    expect(body.startsWith("# Stripe History\n> ")).toBe(true);
    expect(body).toContain("## When to use this");
    expect(body).toContain("Do not use Stripe History for Stripe product APIs");
    expect(body).toContain("https://hraness.com/stripe/about");
    expect(body).toContain("https://hraness.com/stripe/data");
    expect(body).toContain("https://hraness.com/stripe/history/appearances");
    expect(body).not.toContain("openapi");
    expect(body).not.toContain("MCP server");
  });
});
