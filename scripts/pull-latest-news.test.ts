import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import {
  NewsMonitorFileSchema,
  canonicalNewsUrl,
  gdeltTitleMatches,
  parseExaCandidates,
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

const exaMonitor = NewsMonitorFileSchema.parse({
  lookback_days: 8,
  max_candidates: 10,
  max_items_per_monitor: 10,
  minimum_request_interval_ms: 1000,
  monitors: [{
    id: "exa-example",
    include_domains: ["example.com", "techcrunch.com"],
    kind: "exa-search",
    query: "Recent material Stripe company news",
    research_areas: ["company-history"],
    title_any_terms: ["Stripe", "Patrick Collison", "John Collison"],
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
      "techcrunch-latest",
      "exa-stripe-reporting",
      "exa-stripe-leadership-appearances",
      "exa-founder-side-projects",
      "marginal-revolution-founders",
      "gdelt-stripe",
      "gdelt-founders",
      "gdelt-founder-side-projects",
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
    const fetcher = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.toString() === "https://api.exa.ai/search") {
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("x-api-key")).toBe("fixture-exa-key");
        const request = JSON.parse(String(init?.body)) as Readonly<Record<string, unknown>>;
        if (String(request.query).startsWith("Recent news about Patrick Collison or John Collison launching")) {
          expect(request).toEqual({
            category: "news",
            endPublishedDate: "2026-08-16T23:59:59.999Z",
            includeDomains: [
              "bloomberg.com",
              "businesspost.ie",
              "euronews.com",
              "ft.com",
              "marginalrevolution.com",
              "reuters.com",
              "rhinegroup.eu",
              "techcrunch.com",
              "theinformation.com",
              "wsj.com",
            ],
            moderation: true,
            numResults: 40,
            query: "Recent news about Patrick Collison or John Collison launching, chairing, funding, or joining a project, institute, grant program, board, forum, or think tank outside Stripe, including European competitiveness or progress-studies work",
            startPublishedDate: "2026-08-09T00:00:00.000Z",
            type: "auto",
          });
          return response(JSON.stringify({
            requestId: "fixture-side-quest-request",
            results: [{
              publishedDate: "2026-08-15T10:00:00.000Z",
              title: "Rhine Group weekly fixture",
              url: "https://www.rhinegroup.eu/weekly-test-candidate",
            }],
          }), "application/json");
        }
        if (String(request.query).startsWith("Long-form podcast")) {
          expect(request).toEqual({
            endPublishedDate: "2026-08-16T23:59:59.999Z",
            includeDomains: [
              "a16z.com",
              "colossus.com",
              "ecorner.stanford.edu",
              "newcomer.co",
              "podcasts.apple.com",
              "spotify.com",
              "stripe.com",
              "tim.blog",
              "youtube.com",
              "youtu.be",
            ],
            moderation: true,
            numResults: 40,
            query: "Long-form podcast, video interview, keynote, fireside chat, or testimony featuring a Stripe founder or senior executive discussing Stripe's products, company building, strategy, technology, commerce, or operating history",
            startPublishedDate: "2026-08-09T00:00:00.000Z",
            type: "auto",
          });
          return response(JSON.stringify({
            requestId: "fixture-appearance-request",
            results: [{
              publishedDate: "2026-08-15T13:00:00.000Z",
              title: "Will Gaybrick discusses building products at Stripe",
              url: "https://www.youtube.com/watch?v=fixture-appearance",
            }, {
              publishedDate: "2026-08-15T14:00:00.000Z",
              title: "Unrelated founder interview",
              url: "https://www.youtube.com/watch?v=unrelated",
            }],
          }), "application/json");
        }
        expect(request).toEqual({
          category: "news",
          endPublishedDate: "2026-08-16T23:59:59.999Z",
          includeDomains: [
            "bloomberg.com",
            "cnbc.com",
            "ft.com",
            "reuters.com",
            "stripe.com",
            "techcrunch.com",
            "theinformation.com",
            "wsj.com",
          ],
          moderation: true,
          numResults: 40,
          query: "Recent material Stripe company news about acquisitions, signed deals, product launches, leadership, funding, valuation, geographic expansion, or payment infrastructure",
          startPublishedDate: "2026-08-09T00:00:00.000Z",
          type: "auto",
        });
        return response(JSON.stringify({
          requestId: "fixture-request",
          results: [{
            publishedDate: "2026-08-16T20:57:00.000Z",
            title: "Stripe will reportedly acquire AI gateway startup OpenRouter for $7B+",
            url: "https://techcrunch.com/2026/08/16/stripe-openrouter?utm_source=exa",
          }, {
            publishedDate: "2026-08-16T20:58:00.000Z",
            title: "Disallowed result",
            url: "https://untrusted.example/story",
          }, {
            publishedDate: "2026-08-16T20:59:00.000Z",
            title: "Unrelated startup funding",
            url: "https://techcrunch.com/2026/08/16/unrelated",
          }],
        }), "application/json");
      }
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
      if (url.toString() === "https://techcrunch.com/tag/stripe/feed/") {
        return response(`
          <rss><channel><item><title>Stripe payment weekly candidate</title><link>https://example.com/weekly</link><pubDate>Thu, 13 Aug 2026 12:00:00 GMT</pubDate><source>Example News</source></item></channel></rss>
        `, "application/rss+xml");
      }
      if (url.toString() === "https://techcrunch.com/feed/") {
        return response(`
          <rss><channel>
            <item><title>Stripe will reportedly acquire AI gateway startup OpenRouter for $7B+</title><link>https://techcrunch.com/2026/08/16/stripe-openrouter</link><pubDate>Sun, 16 Aug 2026 20:57:00 GMT</pubDate><description>OpenRouter reached a reported agreement with Stripe.</description><source>TechCrunch</source></item>
            <item><title>Unrelated startup funding</title><link>https://techcrunch.com/2026/08/16/unrelated</link><pubDate>Sun, 16 Aug 2026 20:58:00 GMT</pubDate><source>TechCrunch</source></item>
          </channel></rss>
        `, "application/rss+xml");
      }
      if (url.hostname === "marginalrevolution.com") {
        return response("<rss><channel></channel></rss>", "application/rss+xml");
      }
      throw new Error(`Unexpected test request ${url}`);
    }) as typeof fetch;

    const digest = await pullLatestNews({
      asOf: "2026-08-16",
      environment: { EXA_API_KEY: "fixture-exa-key" },
      fetcher,
      generatedAt: "2026-08-16T12:00:00.000Z",
      sleep: async () => {},
    });
    expect(digest.monitors.every(({ status }) => status === "ok")).toBe(true);
    expect(digest.candidates.map(({ url }) => url)).toEqual([
      "https://techcrunch.com/2026/08/16/stripe-openrouter",
      "https://www.rhinegroup.eu/weekly-test-candidate",
      "https://www.youtube.com/watch?v=fixture-appearance",
      "https://stripe.com/newsroom/news/weekly-test-candidate",
      "https://example.com/weekly",
    ]);
    expect(digest.candidates[0]?.monitors).toEqual([
      "exa-stripe-reporting",
      "techcrunch-latest",
    ]);
    expect(digest.candidates[1]?.monitors).toEqual(["exa-founder-side-projects"]);
    expect(digest.candidates[2]?.monitors).toEqual([
      "exa-stripe-leadership-appearances",
    ]);
    expect(digest.candidates[4]?.monitors).toEqual(["gdelt-stripe", "techcrunch-stripe"]);
    expect(digest.discoveryPlans.map(({ collection }) => collection)).toEqual([
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

  test("parses Exa results only from the checked domains and title identities", () => {
    if (exaMonitor?.kind !== "exa-search") throw new Error("Expected Exa monitor");
    expect(parseExaCandidates({
      results: [{
        publishedDate: "2026-08-16T20:57:00.000Z",
        title: "Stripe reportedly reaches an OpenRouter agreement",
        url: "https://news.techcrunch.com/story?utm_source=exa",
      }, {
        publishedDate: "2026-08-16T20:58:00.000Z",
        title: "Off-list result",
        url: "https://attacker.example/story",
      }, {
        publishedDate: "2026-08-16T20:59:00.000Z",
        title: "Unrelated startup funding",
        url: "https://techcrunch.com/unrelated",
      }],
    }, exaMonitor)).toEqual([{
      publishedAt: "2026-08-16",
      source: "news.techcrunch.com",
      title: "Stripe reportedly reaches an OpenRouter agreement",
      url: "https://news.techcrunch.com/story",
    }]);
    expect(() => parseExaCandidates({ results: [{ title: "Missing URL" }] }, exaMonitor))
      .toThrow();
  });

  test("supports a bounded appearance-only historical window", async () => {
    const fetcher = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      expect(input.toString()).toBe("https://api.exa.ai/search");
      const request = JSON.parse(String(init?.body)) as Readonly<Record<string, unknown>>;
      expect(request.startPublishedDate).toBe("2020-01-01T00:00:00.000Z");
      expect(request.endPublishedDate).toBe("2020-12-31T23:59:59.999Z");
      expect(request).not.toHaveProperty("category");
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }) as typeof fetch;
    const digest = await pullLatestNews({
      asOf: "2020-12-31",
      environment: { EXA_API_KEY: "fixture-exa-key" },
      fetcher,
      generatedAt: "2026-08-19T12:00:00.000Z",
      lookbackFrom: "2020-01-01",
      monitorIds: ["exa-stripe-leadership-appearances"],
      sleep: async () => {},
    });
    expect(digest.lookbackFrom).toBe("2020-01-01");
    expect(digest.monitors.map(({ id }) => id)).toEqual([
      "exa-stripe-leadership-appearances",
    ]);
  });

  test("rejects unknown monitor selections and reversed windows", async () => {
    await expect(pullLatestNews({
      asOf: "2026-08-19",
      monitorIds: ["missing-monitor"],
    })).rejects.toThrow("Unknown news monitor");
    await expect(pullLatestNews({
      asOf: "2026-08-19",
      lookbackFrom: "2026-08-20",
      monitorIds: ["exa-stripe-leadership-appearances"],
    })).rejects.toThrow("must not be after");
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
    const loaded = NewsMonitorFileSchema.parse(parse(`
      schema: stripe-history/news-monitors/v1
      lookback_days: 8
      max_candidates: 10
      max_items_per_monitor: 10
      minimum_request_interval_ms: 1000
      monitors:
        - id: gdelt-founder-side-projects
          kind: gdelt
          query: '("Patrick Collison" OR "John Collison" OR "Rhine Group")'
          title_any_terms: [Patrick Collison, John Collison, Rhine Group]
          research_areas: [founder-side-projects]
    `) as unknown).monitors[0];
    if (loaded?.kind !== "gdelt") throw new Error("Expected GDELT side-project monitor");
    expect(gdeltTitleMatches(
      "Nasce il Rhine Group: Draghi, il guru del tech e i big europei insieme per evitare il declino",
      loaded,
    )).toBe(true);
    expect(gdeltTitleMatches("Patrick Collison announces a grant", loaded)).toBe(true);
    expect(gdeltTitleMatches("California wealth tax battle", loaded)).toBe(false);
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

  test("keeps the Thursday publisher bounded, validated, and fast-forward-only", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "weekly-news.yml"),
      "utf8",
    );
    expect(workflow).toContain('cron: "17 9 * * 4"');
    expect(workflow).toContain("timezone: America/Puerto_Rico");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("actions: write");
    expect(workflow).toContain("contents: write");
    expect(workflow).not.toContain("pull-requests: write");
    expect(workflow).toContain("persist-credentials: true");
    expect(workflow).toContain(
      "STRIPEDEX_LLM_API_KEY: ${{ secrets.STRIPE_HISTORY_LLM_API_KEY }}",
    );
    expect(workflow).toContain("EXA_API_KEY: ${{ secrets.EXA_API_KEY }}");
    expect(workflow).toContain("history:publish:auto");
    expect(workflow).toContain("--write --json-out");
    expect(workflow).toContain("--review-out weekly-news/review-queue.md");
    expect(workflow).toContain("Stripedex research review queue");
    expect(workflow).toContain("public/research/automated-decisions.yml");
    expect(workflow).toContain("steps.review.outputs.actionable == '0'");
    expect(workflow).toContain("(.unresolved // .decisions)");
    expect(workflow).toContain("Verify generated diff scope");
    expect(workflow).toContain("bun run history:research:audit");
    expect(workflow).toContain("bun run check");
    expect(workflow).toContain("bun run build");
    expect(workflow).toContain('test "$(git rev-parse HEAD^)" = "$(git rev-parse origin/main)"');
    expect(workflow).toContain('git push origin "HEAD:main"');
    expect(workflow).toContain('test "$remote_sha" = "$candidate_sha"');
    expect(workflow).toContain('.headSha == $sha');
    expect(workflow).toContain('.name == "Required" and .conclusion == "success"');
    expect(workflow).toContain('if gh workflow run ci.yml --repo "$GH_REPO" --ref main');
    expect(workflow).toContain('gh run watch "$main_run_id" --repo "$GH_REPO" --exit-status');
    expect(workflow).toContain("if [ '${{ steps.push.outcome }}' != 'success' ]");
    expect(workflow).toContain("grep -Fq '## Workflow delivery failure'");
    expect(workflow).toContain("sed -n '/^## Workflow delivery failure/,$p'");
    expect(workflow).toContain("review-issue-preserved.md");
    expect(workflow).not.toContain("--auto");
    expect(workflow).not.toContain("gh pr create");
    expect(workflow).not.toContain("gh pr merge");
    expect(workflow).not.toContain("codex exec");
  });

  test("keeps the leadership appearance backfill bounded and review-only", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "appearance-backfill.yml"),
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("EXA_API_KEY: ${{ secrets.EXA_API_KEY }}");
    expect(workflow).toContain("exa-stripe-leadership-appearances");
    expect(workflow).toContain("--from \"$window_from\"");
    expect(workflow).toContain("--as-of \"$window_through\"");
    expect(workflow).toContain("actions/upload-artifact");
    expect(workflow).not.toContain("history:publish:auto");
    expect(workflow).not.toContain("issues: write");
    expect(workflow).not.toContain("contents: write");
  });
});
