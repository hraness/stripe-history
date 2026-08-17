import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "bun:test";
import { parse, stringify } from "yaml";
import { z } from "zod";

import { AutomatedPublicationLedgerSchema } from "../lib/automated-publication-schema";
import { HistoryFileSchema } from "../lib/history-schema";
import { ResearchSourceCatalogSchema } from "../lib/research-schema";
import { stableResearchSourceId } from "../lib/research-source-identity";
import { auditHistoryResearch } from "./audit-history-research";
import {
  autoPublishHistory,
  PublicationProposalSchema,
  renderAutomatedPublicationMarkdown,
  type PublicationGenerator,
} from "./auto-publish-history";

const temporaryDirectories: string[] = [];

type DigestCandidate = Readonly<{
  monitors: readonly string[];
  publishedAt?: string;
  researchAreas: readonly string[];
  source: string;
  title: string;
  url: string;
}>;

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

async function fixtureProject(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "stripe-auto-publish-"));
  temporaryDirectories.push(directory);
  await cp(join(process.cwd(), "public"), join(directory, "public"), { recursive: true });
  return directory;
}

async function writeDigest(
  directory: string,
  candidate: DigestCandidate,
): Promise<void> {
  await writeDigestCandidates(directory, [candidate]);
}

async function writeDigestCandidates(
  directory: string,
  candidates: readonly DigestCandidate[],
): Promise<void> {
  await writeFile(join(directory, "digest.json"), JSON.stringify({
    asOf: "2026-08-16",
    candidates,
    discoveryPlans: [],
    generatedAt: "2026-08-16T12:00:00.000Z",
    lookbackFrom: "2026-08-09",
    monitors: [],
    schema: "stripe-history/weekly-news-digest/v1",
  }));
}

const evidenceQuote = "Stripe announced the Example Network on August 15, 2026, and made it available to businesses in the United States.";
const evidenceBody = `<article><h1>Stripe launches Example Network</h1><p>${evidenceQuote}</p><p>${"The official announcement describes product availability and operating scope. ".repeat(12)}</p></article>`;
const response = (): Response => new Response(evidenceBody, {
  headers: { "content-type": "text/html; charset=utf-8" },
  status: 200,
});

function acceptedGenerator(calls: string[]): PublicationGenerator {
  return (async (options) => {
    calls.push(`${options.name}:${String(options.model)}:${String(options.reasoningEffort)}`);
    if (options.name === "weekly_stripe_history_proposal") {
      return {
        disposition: "publish-new",
        evidence_quotes: [evidenceQuote],
        existing_event_id: null,
        event: {
          amount: null,
          category: "product-launches",
          confidence: "confirmed",
          date: "2026-08-15",
          details: [],
          locations: ["United States"],
          metrics: [],
          organizations: ["Stripe"],
          people: [],
          status: "Launched",
          summary: "Stripe launched Example Network and made the product available to businesses in the United States.",
          tags: ["payments"],
          title: "Stripe launches Example Network",
        },
        reason: "The official announcement documents a material product launch.",
      } as never;
    }
    return {
      evidence_quotes: [evidenceQuote],
      reason: "The exact source text supports the event, date, availability, and organizations.",
      verdict: "approve",
    } as never;
  }) as PublicationGenerator;
}

describe("automatic history publication", () => {
  test("uses an AI Gateway-compatible proposal schema without oneOf", () => {
    const jsonSchema = z.toJSONSchema(PublicationProposalSchema);

    expect(JSON.stringify(jsonSchema)).not.toContain('"oneOf"');
    expect(PublicationProposalSchema.parse({
      disposition: "reject",
      event: null,
      evidence_quotes: [],
      existing_event_id: null,
      reason: "The candidate is routine marketing rather than a material event.",
    })).toMatchObject({ disposition: "reject" });
    expect(() => PublicationProposalSchema.parse({
      disposition: "publish-new",
      event: null,
      evidence_quotes: [],
      existing_event_id: null,
      reason: "The source appears to describe a material event.",
    })).toThrow("publish-new requires an event");
  });

  test("renders untrusted report labels and URLs without Markdown injection", () => {
    const markdown = renderAutomatedPublicationMarkdown({
      asOf: "2026-08-16",
      decisions: [{
        outcome: "needs-review",
        reason: "Review [this] candidate.",
        title: "[Candidate](https://attacker.example)",
        url: "https://example.com/story_(draft)",
      }],
      generatedAt: "2026-08-16T12:00:00.000Z",
      model: "openai/gpt-5.6-sol",
      published: 0,
      reasoningEffort: "max",
      schema: "stripe-history/automated-publication-report/v1",
    });

    expect(markdown).toContain("\\[Candidate\\](https://attacker.example)");
    expect(markdown).toContain("<https://example.com/story_%28draft%29>");
    expect(markdown).toContain("Review \\[this\\] candidate.");
  });

  test("uses Sol max twice and commits only deterministic sourced YAML", async () => {
    const directory = await fixtureProject();
    const candidate = {
      monitors: ["stripe-newsroom"],
      publishedAt: "2026-08-15",
      researchAreas: ["company-history"],
      source: "Stripe",
      title: "Stripe launches Example Network",
      url: "https://stripe.com/newsroom/news/example-network",
    } as const;
    await writeDigest(directory, candidate);
    const calls: string[] = [];

    const report = await autoPublishHistory({
      digestPath: "digest.json",
      environment: { STRIPE_HISTORY_LLM_API_KEY: "fixture-gateway-credential" },
      fetcher: async () => response(),
      generatedAt: "2026-08-16T12:00:00.000Z",
      generator: acceptedGenerator(calls),
      projectDirectory: directory,
      write: true,
    });

    expect(report.published).toBe(1);
    expect(report.decisions).toMatchObject([{
      category: "product-launches",
      eventId: "stripe-launches-example-network",
      outcome: "published-new-event",
    }]);
    expect(calls).toEqual([
      "weekly_stripe_history_proposal:openai/gpt-5.6-sol:max",
      "weekly_stripe_history_review:openai/gpt-5.6-sol:max",
    ]);

    const sourceId = stableResearchSourceId(candidate.url, candidate.publishedAt);
    const sources = ResearchSourceCatalogSchema.parse(parse(await readFile(
      join(directory, "public", "research", "sources.yml"),
      "utf8",
    )) as unknown);
    expect(sources.sources.find(({ id }) => id === sourceId)).toMatchObject({
      kind: "primary",
      publisher: "Stripe",
      title: candidate.title,
      url: candidate.url,
    });
    const history = HistoryFileSchema.parse(parse(await readFile(
      join(directory, "public", "history", "product-launches.yml"),
      "utf8",
    )) as unknown);
    expect(history.events.find(({ id }) => id === "stripe-launches-example-network"))
      .toMatchObject({ source_ids: [sourceId], confidence: "confirmed" });
    const ledger = AutomatedPublicationLedgerSchema.parse(parse(await readFile(
      join(directory, "public", "research", "automated-publications.yml"),
      "utf8",
    )) as unknown);
    expect(ledger.runs).toHaveLength(1);
    expect(ledger.runs[0]).toMatchObject({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "max",
      review_mode: "independent-grounded-second-pass",
    });
    expect(JSON.stringify(ledger)).not.toContain(evidenceQuote);
    await expect(auditHistoryResearch(directory)).resolves.toMatchObject({ events: 232 });

    const repeat = await autoPublishHistory({
      digestPath: "digest.json",
      environment: { STRIPE_HISTORY_LLM_API_KEY: "fixture-gateway-credential" },
      fetcher: async () => {
        throw new Error("Idempotent retries must not fetch");
      },
      generator: (async () => {
        throw new Error("Idempotent retries must not call the model");
      }) as PublicationGenerator,
      projectDirectory: directory,
      write: true,
    });
    expect(repeat.published).toBe(0);

    const tamperedHistory = HistoryFileSchema.parse(parse(await readFile(
      join(directory, "public", "history", "product-launches.yml"),
      "utf8",
    )) as unknown);
    const publishedEvent = tamperedHistory.events.find(
      ({ id }) => id === "stripe-launches-example-network",
    );
    if (publishedEvent === undefined) throw new Error("Missing automatic publication fixture");
    publishedEvent.id = "tampered-automatic-publication-event";
    await writeFile(
      join(directory, "public", "history", "product-launches.yml"),
      stringify(tamperedHistory, { lineWidth: 0 }),
    );
    await expect(auditHistoryResearch(directory)).rejects.toThrow(
      "references missing product-launches event stripe-launches-example-network",
    );
  });

  test("attests multiple decisions in canonical order regardless of discovery order", async () => {
    const directory = await fixtureProject();
    const beta = {
      monitors: ["stripe-newsroom"],
      publishedAt: "2026-08-15",
      researchAreas: ["company-history"],
      source: "Stripe",
      title: "Stripe launches Beta Network",
      url: "https://stripe.com/newsroom/news/beta-network",
    } as const;
    const alpha = {
      ...beta,
      title: "Stripe launches Alpha Network",
      url: "https://stripe.com/newsroom/news/alpha-network",
    } as const;
    await writeDigestCandidates(directory, [beta, alpha]);
    const generator = (async (options) => {
      const input = JSON.parse(options.prompt) as {
        candidate: { title: string };
        evidence_text: string;
      };
      const evidence = input.evidence_text.split("\n").find((line) =>
        line.startsWith("Stripe announced"));
      if (evidence === undefined) throw new Error("Missing generated evidence fixture");
      if (options.name === "weekly_stripe_history_proposal") {
        return {
          disposition: "publish-new",
          evidence_quotes: [evidence],
          existing_event_id: null,
          event: {
            amount: null,
            category: "product-launches",
            confidence: "confirmed",
            date: "2026-08-15",
            details: [],
            locations: ["United States"],
            metrics: [],
            organizations: ["Stripe"],
            people: [],
            status: "Launched",
            summary: `${input.candidate.title} and made it available to businesses in the United States.`,
            tags: ["payments"],
            title: input.candidate.title,
          },
          reason: "The official announcement documents a material product launch.",
        } as never;
      }
      return {
        evidence_quotes: [evidence],
        reason: "The exact source text supports the event, date, availability, and organizations.",
        verdict: "approve",
      } as never;
    }) as PublicationGenerator;

    const report = await autoPublishHistory({
      digestPath: "digest.json",
      environment: { STRIPE_HISTORY_LLM_API_KEY: "fixture-gateway-credential" },
      fetcher: async (input) => {
        const title = String(input).includes("alpha") ? alpha.title : beta.title;
        const quote = `Stripe announced ${title.replace("Stripe launches ", "the ")} on August 15, 2026, and made it available to businesses in the United States.`;
        return new Response(`<article><p>${quote}</p><p>${"The official announcement describes product availability and operating scope. ".repeat(12)}</p></article>`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      generator,
      projectDirectory: directory,
      write: true,
    });

    expect(report.published).toBe(2);
    const ledger = AutomatedPublicationLedgerSchema.parse(parse(await readFile(
      join(directory, "public", "research", "automated-publications.yml"),
      "utf8",
    )) as unknown);
    expect(ledger.runs[0]?.decisions.map(({ candidate_url: url }) => url)).toEqual([
      alpha.url,
      beta.url,
    ]);
    await expect(auditHistoryResearch(directory)).resolves.toMatchObject({
      automatedPublicationDecisions: 2,
      automatedPublicationRuns: 1,
    });
  });

  test("fails closed when reporting is promoted to confirmed fact", async () => {
    const directory = await fixtureProject();
    await writeDigest(directory, {
      monitors: ["techcrunch-stripe"],
      publishedAt: "2026-08-15",
      researchAreas: ["company-history"],
      source: "TechCrunch",
      title: "Stripe launches Example Network",
      url: "https://techcrunch.com/2026/08/15/stripe-example-network/",
    });
    const originalSources = await readFile(
      join(directory, "public", "research", "sources.yml"),
      "utf8",
    );
    const generator = acceptedGenerator([]);
    const report = await autoPublishHistory({
      digestPath: "digest.json",
      environment: { AI_GATEWAY_API_KEY: "fixture-gateway-credential" },
      fetcher: async () => response(),
      generator,
      projectDirectory: directory,
      write: true,
    });
    expect(report.published).toBe(0);
    expect(report.decisions[0]?.outcome).toBe("infrastructure-error");
    expect(report.decisions[0]?.reason).toContain("reporting source");
    expect(await readFile(join(directory, "public", "research", "sources.yml"), "utf8"))
      .toBe(originalSources);
  });

  test("keeps untrusted-monitor and founder-only candidates in manual review without credentials", async () => {
    const directory = await fixtureProject();
    await writeDigest(directory, {
      monitors: ["gdelt-founders"],
      publishedAt: "2026-08-15",
      researchAreas: ["founder-side-projects"],
      source: "example.com",
      title: "Patrick Collison starts an example project",
      url: "https://example.com/patrick-project",
    });
    const report = await autoPublishHistory({
      digestPath: "digest.json",
      projectDirectory: directory,
      write: true,
    });
    expect(report.published).toBe(0);
    expect(report.decisions).toMatchObject([{
      outcome: "needs-review",
      reason: expect.stringContaining("automatic policy"),
    }]);
  });

  test("requires the independent reviewer to return literal source evidence", async () => {
    const directory = await fixtureProject();
    await writeDigest(directory, {
      monitors: ["stripe-newsroom"],
      publishedAt: "2026-08-15",
      researchAreas: ["company-history"],
      source: "Stripe",
      title: "Stripe launches Example Network",
      url: "https://stripe.com/newsroom/news/example-network",
    });
    let call = 0;
    const generator = (async () => {
      call += 1;
      if (call === 1) return (await acceptedGenerator([])({
        credential: { kind: "api-key", value: "fixture-gateway-credential" },
        name: "weekly_stripe_history_proposal",
        prompt: "",
        schema: {} as never,
        system: "",
        tags: [],
      })) as never;
      return {
        evidence_quotes: ["This sentence does not occur in the article evidence."],
        reason: "The proposal appears supported.",
        verdict: "approve",
      } as never;
    }) as PublicationGenerator;
    const report = await autoPublishHistory({
      digestPath: "digest.json",
      environment: { STRIPE_HISTORY_LLM_API_KEY: "fixture-gateway-credential" },
      fetcher: async () => response(),
      generator,
      projectDirectory: directory,
      write: true,
    });
    expect(report.published).toBe(0);
    expect(report.decisions[0]?.outcome).toBe("infrastructure-error");
    expect(report.decisions[0]?.reason).toContain("exact substrings");
  });
});
