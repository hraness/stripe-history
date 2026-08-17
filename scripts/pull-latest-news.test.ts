import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import {
  NewsMonitorFileSchema,
  canonicalNewsUrl,
  gdeltTitleMatches,
  parseGdeltCandidates,
  parseHtmlArticle,
  parseHtmlIndexLinks,
  parseRssCandidates,
  pullLatestNews,
  renderWeeklyNewsMarkdown,
} from "./pull-latest-news";

const rssMonitor = NewsMonitorFileSchema.parse({
  lookback_days: 8,
  max_candidates: 10,
  max_items_per_monitor: 10,
  minimum_request_interval_ms: 1000,
  monitors: [{
    id: "example-feed",
    include_terms: ["Stripe"],
    kind: "rss",
    research_areas: ["company-history"],
    url: "https://example.com/feed/",
  }],
  schema: "stripe-history/news-monitors/v1",
}).monitors[0];

const htmlMonitor = NewsMonitorFileSchema.parse({
  lookback_days: 8,
  max_candidates: 10,
  max_items_per_monitor: 10,
  minimum_request_interval_ms: 1000,
  monitors: [{
    id: "example-index",
    kind: "html-index",
    link_path_prefixes: ["/news/"],
    research_areas: ["company-history"],
    url: "https://example.com/news",
  }],
  schema: "stripe-history/news-monitors/v1",
}).monitors[0];

describe("weekly news discovery", () => {
  test("loads the checked monitor configuration", async () => {
    const value = parse(await readFile(
      join(process.cwd(), "public", "research", "news-monitors.yml"),
      "utf8",
    )) as unknown;
    const config = NewsMonitorFileSchema.parse(value);
    expect(config.lookback_days).toBe(8);
    expect(config.monitors.map(({ id }) => id)).toEqual([
      "stripe-newsroom",
      "stripe-blog",
      "techcrunch-stripe",
      "marginal-revolution-founders",
      "gdelt-stripe",
      "gdelt-founders",
    ]);
  });

  test("canonicalizes candidate URLs without accepting non-HTTPS links", () => {
    expect(canonicalNewsUrl(
      "https://www.stripe.com/us/newsroom/news/example/?utm_source=test#section",
    )).toBe("https://stripe.com/newsroom/news/example");
    expect(() => canonicalNewsUrl("http://example.com/story")).toThrow("HTTPS");
  });

  test("parses and filters RSS candidates", () => {
    if (rssMonitor?.kind !== "rss") throw new Error("Expected RSS monitor");
    const candidates = parseRssCandidates(`<?xml version="1.0"?>
      <rss><channel>
        <item><title><![CDATA[Stripe buys <em>Example</em>]]></title><link>https://example.com/stripe?utm_source=rss</link><pubDate>Thu, 13 Aug 2026 12:00:00 GMT</pubDate><source>Example News</source></item>
        <item><title>Unrelated story</title><link>https://example.com/other</link><pubDate>Thu, 13 Aug 2026 12:00:00 GMT</pubDate></item>
      </channel></rss>`, rssMonitor);
    expect(candidates).toEqual([{
      publishedAt: "2026-08-13",
      source: "Example News",
      title: "Stripe buys Example",
      url: "https://example.com/stripe",
    }]);
  });

  test("runs every configured monitor and deduplicates the review queue", async () => {
    const response = (body: string, contentType: string): Response => new Response(body, {
      headers: { "content-type": contentType },
      status: 200,
    });
    const fetcher = (async (input: string | URL | Request): Promise<Response> => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.hostname === "api.gdeltproject.org") {
        const founders = url.searchParams.get("query")?.includes("Patrick") === true;
        return response(JSON.stringify({ articles: founders ? [] : [{
          domain: "example.com",
          language: "English",
          seendate: "20260813T120000Z",
          sourcecountry: "United States",
          title: "Stripe payment weekly candidate",
          url: "https://example.com/weekly?utm_source=gdelt",
        }] }), "application/json");
      }
      if (url.toString() === "https://stripe.com/newsroom") {
        return response(`
          <a href="/newsroom/news/sessions-2026">Known source</a>
          <a href="/newsroom/news/weekly-test-candidate">Weekly candidate</a>
        `, "text/html");
      }
      if (url.toString() === "https://stripe.com/newsroom/news/weekly-test-candidate") {
        return response(`
          <script type="application/ld+json">{"@type":"NewsArticle","headline":"Stripe newsroom candidate","datePublished":"2026-08-14"}</script>
        `, "text/html");
      }
      if (url.toString() === "https://stripe.com/blog") {
        return response("<a href=\"/about\">About</a>", "text/html");
      }
      if (url.hostname === "techcrunch.com") {
        return response(`
          <rss><channel><item><title>Stripe payment weekly candidate</title><link>https://example.com/weekly</link><pubDate>Thu, 13 Aug 2026 12:00:00 GMT</pubDate><source>Example News</source></item></channel></rss>
        `, "application/rss+xml");
      }
      if (url.hostname === "marginalrevolution.com") {
        return response("<rss><channel></channel></rss>", "application/rss+xml");
      }
      throw new Error(`Unexpected test request ${url}`);
    }) as typeof fetch;

    const digest = await pullLatestNews({
      asOf: "2026-08-16",
      fetcher,
      generatedAt: "2026-08-16T12:00:00.000Z",
      sleep: async () => {},
    });
    expect(digest.monitors.every(({ status }) => status === "ok")).toBe(true);
    expect(digest.candidates.map(({ url }) => url)).toEqual([
      "https://stripe.com/newsroom/news/weekly-test-candidate",
      "https://example.com/weekly",
    ]);
    expect(digest.candidates[1]?.monitors).toEqual(["gdelt-stripe", "techcrunch-stripe"]);
    expect(digest.discoveryPlans.map(({ collection }) => collection)).toEqual([
      "founder-appearances",
      "founder-side-projects",
      "valuation-history",
    ]);
  });

  test("extracts bounded index links and article metadata", () => {
    if (htmlMonitor?.kind !== "html-index") throw new Error("Expected HTML monitor");
    expect(parseHtmlIndexLinks(`
      <a href="/news/new-company"><span>New company</span></a>
      <a href="/about">About</a>
      <a href="javascript:alert(1)">Bad</a>
    `, htmlMonitor)).toEqual([{
      title: "New company",
      url: "https://example.com/news/new-company",
    }]);
    expect(parseHtmlArticle(`
      <script type="application/ld+json">{"@context":"https://schema.org","@type":["Article","NewsArticle"],"headline":"Stripe launches Example","datePublished":"2026-08-13T12:00:00Z"}</script>
    `)).toEqual({ publishedAt: "2026-08-13", title: "Stripe launches Example" });
  });

  test("parses strict GDELT article fields and rejects malformed payloads", () => {
    expect(parseGdeltCandidates({ articles: [{
      domain: "example.com",
      language: "English",
      seendate: "20260813T120000Z",
      sourcecountry: "United States",
      title: "Stripe reports an update",
      url: "https://example.com/update?utm_medium=feed",
    }] })).toEqual([{
      publishedAt: "2026-08-13",
      source: "example.com",
      title: "Stripe reports an update",
      url: "https://example.com/update",
    }]);
    expect(() => parseGdeltCandidates({ articles: [{ title: "Incomplete" }] })).toThrow();
  });

  test("rejects generic stripe and body-only founder matches", () => {
    const config = NewsMonitorFileSchema.parse(parse(`
      schema: stripe-history/news-monitors/v1
      lookback_days: 8
      max_candidates: 10
      max_items_per_monitor: 10
      minimum_request_interval_ms: 1000
      monitors:
        - id: stripe
          kind: gdelt
          query: Stripe
          title_any_terms: [Stripe]
          title_context_terms: [payment, acquire]
          research_areas: [company-history]
        - id: founders
          kind: gdelt
          query: Patrick
          title_any_terms: [Patrick Collison, John Collison]
          research_areas: [founder-side-projects]
    `) as unknown);
    const stripe = config.monitors[0];
    const founders = config.monitors[1];
    if (stripe?.kind !== "gdelt" || founders?.kind !== "gdelt") {
      throw new Error("Expected GDELT monitors");
    }
    expect(gdeltTitleMatches("Stripe acquires Example", stripe)).toBe(true);
    expect(gdeltTitleMatches("Buckeye sheds its black stripe", stripe)).toBe(false);
    expect(gdeltTitleMatches("Striped bedding for autumn", stripe)).toBe(false);
    expect(gdeltTitleMatches("Patrick Collison announces a grant", founders)).toBe(true);
    expect(gdeltTitleMatches("California wealth tax battle", founders)).toBe(false);
  });

  test("renders untrusted titles as escaped review candidates", () => {
    const markdown = renderWeeklyNewsMarkdown({
      asOf: "2026-08-13",
      candidates: [{
        monitors: ["example-feed"],
        publishedAt: "2026-08-13",
        researchAreas: ["company-history"],
        source: "Example News",
        title: "Stripe [report] <draft>",
        url: "https://example.com/report",
      }],
      discoveryPlans: [],
      generatedAt: "2026-08-13T12:00:00.000Z",
      lookbackFrom: "2026-08-06",
      monitors: [{ candidates: 1, id: "example-feed", status: "ok" }],
      schema: "stripe-history/weekly-news-digest/v1",
    });
    expect(markdown).toContain("Stripe \\[report\\] \\<draft\\>");
    expect(markdown).toContain("discovery candidates, not accepted historical facts");
  });

  test("keeps the Thursday publisher bounded, validated, and fast-forward only", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "weekly-news.yml"),
      "utf8",
    );
    expect(workflow).toContain('cron: "17 9 * * 4"');
    expect(workflow).toContain("timezone: America/Puerto_Rico");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("persist-credentials: true");
    expect(workflow).toContain("STRIPE_HISTORY_LLM_API_KEY");
    expect(workflow).toContain("history:publish:auto");
    expect(workflow).toContain("--write --json-out");
    expect(workflow).toContain("Verify generated diff scope");
    expect(workflow).toContain("bun run history:research:audit");
    expect(workflow).toContain("bun run check");
    expect(workflow).toContain("bun run build");
    expect(workflow).toContain('test "$(git rev-parse HEAD^)" = "$(git rev-parse origin/main)"');
    expect(workflow).toContain("git push origin HEAD:main");
    expect(workflow).not.toContain("codex exec");
  });
});
