import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { HistoryFileSchema, historyCategoryIds } from "../lib/history-schema";
import { ResearchSourceCatalogSchema } from "../lib/research-schema";
import { canonicalResearchSourceUrl } from "../lib/research-source-identity";
import { boundedResponseText } from "./bounded-http";
import {
  planHistoryResearchDiscovery,
  type ResearchDiscoveryPlan,
} from "./audit-history-research";

const NEWS_SCHEMA = "stripe-history/weekly-news-digest/v1" as const;
const EXA_ENDPOINT = "https://api.exa.ai/search";
const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const RESPONSE_BYTE_LIMIT = 4 * 1024 * 1024;
const MAX_SOURCE_LENGTH = 160;
const MAX_TITLE_LENGTH = 240;
const MAX_URL_LENGTH = 4_096;
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

const commonMonitorFields = {
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  research_areas: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)).min(1).max(12),
} as const;

const NewsMonitorSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...commonMonitorFields,
    category: z.literal("news").nullable().default("news"),
    include_domains: z.array(
      z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/u),
    ).min(1).max(40),
    kind: z.literal("exa-search"),
    query: z.string().min(10).max(500),
    title_any_terms: z.array(z.string().min(2).max(80)).max(40).default([]),
    title_terms_from_history_category: z.enum(historyCategoryIds).optional(),
  }),
  z.strictObject({
    ...commonMonitorFields,
    kind: z.literal("gdelt"),
    query: z.string().min(3).max(240),
    title_any_terms: z.array(z.string().min(2).max(80)).min(1).max(20),
    title_context_terms: z.array(z.string().min(2).max(80)).min(1).max(50).optional(),
  }),
  z.strictObject({
    ...commonMonitorFields,
    kind: z.literal("html-index"),
    link_path_prefixes: z.array(z.string().startsWith("/")).min(1).max(12),
    url: z.url({ protocol: /^https$/u }),
  }),
  z.strictObject({
    ...commonMonitorFields,
    include_terms: z.array(z.string().min(2).max(80)).min(1).max(20).optional(),
    kind: z.literal("rss"),
    url: z.url({ protocol: /^https$/u }),
  }),
]);

export const NewsMonitorFileSchema = z.strictObject({
  lookback_days: z.number().int().min(2).max(31),
  max_candidates: z.number().int().min(1).max(250),
  max_items_per_monitor: z.number().int().min(1).max(75),
  minimum_request_interval_ms: z.number().int().min(250).max(10_000),
  monitors: z.array(NewsMonitorSchema).min(1).max(30),
  schema: z.literal("stripe-history/news-monitors/v1"),
}).superRefine(({ monitors }, context) => {
  const ids = monitors.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "News monitor IDs must be unique" });
  }
  for (const [index, monitor] of monitors.entries()) {
    if (
      monitor.kind === "exa-search"
      && monitor.title_any_terms.length === 0
      && monitor.title_terms_from_history_category === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Exa monitors require explicit or history-derived title terms",
        path: ["monitors", index],
      });
    }
  }
});

const GdeltResponseSchema = z.strictObject({
  articles: z.array(z.object({
    domain: z.string().max(MAX_SOURCE_LENGTH).optional(),
    language: z.string().max(80).optional(),
    seendate: z.string().max(40),
    sourcecountry: z.string().max(120).optional(),
    title: z.string().max(2_000),
    url: z.url().max(MAX_URL_LENGTH),
  }).passthrough()).max(250),
}).passthrough();

const ExaResponseSchema = z.object({
  results: z.array(z.object({
    publishedDate: z.string().max(80).nullable().optional(),
    title: z.string().max(2_000).nullable().optional(),
    url: z.url().max(MAX_URL_LENGTH),
  }).passthrough()).max(100),
}).passthrough();

type NewsMonitor = z.infer<typeof NewsMonitorSchema>;
type Fetcher = typeof fetch;

export interface NewsCandidate {
  readonly monitors: readonly string[];
  readonly publishedAt?: string;
  readonly researchAreas: readonly string[];
  readonly source: string;
  readonly title: string;
  readonly url: string;
}

export interface NewsMonitorReport {
  readonly candidates: number;
  readonly error?: string;
  readonly id: string;
  readonly status: "error" | "ok" | "partial";
}

export interface WeeklyNewsDigest {
  readonly asOf: string;
  readonly candidates: readonly NewsCandidate[];
  readonly discoveryPlans: readonly ResearchDiscoveryPlan[];
  readonly generatedAt: string;
  readonly lookbackFrom: string;
  readonly monitors: readonly NewsMonitorReport[];
  readonly schema: typeof NEWS_SCHEMA;
}

interface CandidateInput {
  readonly publishedAt?: string;
  readonly source: string;
  readonly title: string;
  readonly url: string;
}

export interface PullOptions {
  readonly asOf: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly fetcher?: Fetcher;
  readonly generatedAt?: string;
  readonly lookbackFrom?: string;
  readonly monitorIds?: readonly string[];
  readonly projectDirectory?: string;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

const sleepFor = (milliseconds: number): Promise<void> =>
  new Promise((settle) => setTimeout(settle, milliseconds));

function exactIsoDate(value: string, owner: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error(`${owner} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${owner} must be a real calendar date`);
  }
  return value;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${exactIsoDate(value, "Date")}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateInWindow(value: string | undefined, from: string, through: string): boolean {
  return value !== undefined && value >= from && value <= through;
}

function removeTracking(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
}

export function canonicalNewsUrl(value: string): string {
  if (value.length > MAX_URL_LENGTH) throw new Error("News candidate URL is too long");
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("News candidates must use HTTPS");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  removeTracking(url);
  url.searchParams.sort();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/u, "");
  return canonicalResearchSourceUrl(url.toString());
}

function cleanText(value: string): string {
  return value
    .replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll(/&#(\d+);/gu, (match, digits: string) => {
      const point = Number(digits);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replaceAll(/&#x([a-f0-9]+);/giu, (match, digits: string) => {
      const point = Number.parseInt(digits, 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replaceAll(/\s+/gu, " ")
    .trim();
}

function boundedText(value: string, maximum: number): string {
  return cleanText(value).slice(0, maximum).trim();
}

function tagValue(block: string, name: string): string | undefined {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "iu").exec(block);
  return match?.[1] === undefined ? undefined : boundedText(match[1], 4_000);
}

function parsePublishedDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const gdelt = /^(\d{4})(\d{2})(\d{2})T\d{6}Z$/u.exec(value);
  const date = new Date(gdelt === null
    ? value
    : `${gdelt[1]}-${gdelt[2]}-${gdelt[3]}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function parseRssCandidates(
  xml: string,
  monitor: Extract<NewsMonitor, { kind: "rss" }>,
): readonly CandidateInput[] {
  const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/giu)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
  return blocks.flatMap((block) => {
    const title = tagValue(block, "title");
    const link = tagValue(block, "link");
    const description = tagValue(block, "description") ?? "";
    if (title === undefined || link === undefined) return [];
    const searchable = `${title}\n${description}`.toLocaleLowerCase("en-US");
    if (monitor.include_terms !== undefined && !monitor.include_terms.some((term) =>
      searchable.includes(term.toLocaleLowerCase("en-US")))) return [];
    try {
      const publishedAt = parsePublishedDate(tagValue(block, "pubDate"));
      return [{
        ...(publishedAt === undefined ? {} : { publishedAt }),
        source: boundedText(tagValue(block, "source") ?? new URL(link).hostname, MAX_SOURCE_LENGTH),
        title: boundedText(title, MAX_TITLE_LENGTH),
        url: canonicalNewsUrl(link),
      }];
    } catch {
      return [];
    }
  });
}

function htmlAttribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "iu").exec(tag);
  return match?.[2] === undefined ? undefined : cleanText(match[2]);
}

export function parseHtmlIndexLinks(
  html: string,
  monitor: Extract<NewsMonitor, { kind: "html-index" }>,
): readonly Readonly<{ title: string; url: string }>[] {
  const output = new Map<string, string>();
  for (const match of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/giu)) {
    const tag = match[0];
    const href = htmlAttribute(tag, "href");
    if (href === undefined) continue;
    try {
      const resolved = new URL(href, monitor.url);
      if (!monitor.link_path_prefixes.some((prefix) => resolved.pathname.startsWith(prefix))) {
        continue;
      }
      const url = canonicalNewsUrl(resolved.toString());
      const title = boundedText(tag, MAX_TITLE_LENGTH);
      if (title.length >= 4 && !output.has(url)) output.set(url, title);
    } catch {
      // Ignore malformed or non-HTTPS links from remote indexes.
    }
  }
  return [...output].map(([url, title]) => ({ title, url }));
}

function jsonLdArticle(value: unknown): Readonly<{ publishedAt?: string; title?: string }> | null {
  if (Array.isArray(value)) {
    for (const child of value) {
      const result = jsonLdArticle(child);
      if (result !== null) return result;
    }
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (record["@graph"] !== undefined) {
    const result = jsonLdArticle(record["@graph"]);
    if (result !== null) return result;
  }
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (!types.some((entry) => entry === "Article" || entry === "NewsArticle")) return null;
  const title = typeof record.headline === "string"
    ? boundedText(record.headline, MAX_TITLE_LENGTH)
    : undefined;
  const publishedAt = typeof record.datePublished === "string"
    ? parsePublishedDate(record.datePublished)
    : undefined;
  return {
    ...(publishedAt === undefined ? {} : { publishedAt }),
    ...(title === undefined ? {} : { title }),
  };
}

function metaContent(html: string, key: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = match[0];
    if (htmlAttribute(tag, "property") === key || htmlAttribute(tag, "name") === key) {
      return htmlAttribute(tag, "content");
    }
  }
  return undefined;
}

export function parseHtmlArticle(
  html: string,
): Readonly<{ publishedAt?: string; title?: string }> {
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/giu,
  )) {
    try {
      const result = jsonLdArticle(JSON.parse(match[2] ?? ""));
      if (result !== null) return result;
    } catch {
      // Continue to ordinary metadata when a page contains unrelated invalid JSON-LD.
    }
  }
  const publishedAt = parsePublishedDate(
    metaContent(html, "article:published_time") ?? metaContent(html, "datePublished"),
  );
  const title = metaContent(html, "og:title");
  return {
    ...(publishedAt === undefined ? {} : { publishedAt }),
    ...(title === undefined ? {} : { title: boundedText(title, MAX_TITLE_LENGTH) }),
  };
}

export function parseGdeltCandidates(value: unknown): readonly CandidateInput[] {
  return GdeltResponseSchema.parse(value).articles.flatMap((article) => {
    try {
      const publishedAt = parsePublishedDate(article.seendate);
      return [{
        ...(publishedAt === undefined ? {} : { publishedAt }),
        source: boundedText(article.domain ?? new URL(article.url).hostname, MAX_SOURCE_LENGTH),
        title: boundedText(article.title, MAX_TITLE_LENGTH),
        url: canonicalNewsUrl(article.url),
      }];
    } catch {
      return [];
    }
  });
}

function domainMatches(hostname: string, allowedDomain: string): boolean {
  return hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`);
}

export function parseExaCandidates(
  value: unknown,
  monitor: Extract<NewsMonitor, { kind: "exa-search" }>,
  titleTerms: readonly string[] = monitor.title_any_terms,
): readonly CandidateInput[] {
  return ExaResponseSchema.parse(value).results.flatMap((result) => {
    if (result.title === undefined || result.title === null) return [];
    if (!titleTerms.some((term) =>
      titleContainsBoundedTerm(result.title ?? "", term))) return [];
    try {
      const url = canonicalNewsUrl(result.url);
      const hostname = new URL(url).hostname;
      if (!monitor.include_domains.some((domain) => domainMatches(hostname, domain))) return [];
      const publishedAt = parsePublishedDate(result.publishedDate ?? undefined);
      return [{
        ...(publishedAt === undefined ? {} : { publishedAt }),
        source: hostname,
        title: boundedText(result.title, MAX_TITLE_LENGTH),
        url,
      }];
    } catch {
      return [];
    }
  });
}

async function resolvedExaTitleTerms(
  projectDirectory: string,
  monitor: Extract<NewsMonitor, { kind: "exa-search" }>,
): Promise<readonly string[]> {
  const terms = new Set(monitor.title_any_terms);
  if (monitor.title_terms_from_history_category !== undefined) {
    const file = HistoryFileSchema.parse(parse(await readFile(join(
      projectDirectory,
      "public",
      "history",
      `${monitor.title_terms_from_history_category}.yml`,
    ), "utf8")) as unknown);
    for (const event of file.events) {
      for (const person of event.people ?? []) terms.add(person);
    }
  }
  return [...terms].toSorted();
}

async function requestText(
  url: string,
  fetcher: Fetcher,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetcher(url, {
        headers: { "User-Agent": "stripehistory.com weekly research (+https://stripehistory.com/)" },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      const body = await boundedResponseText(response, {
        allowErrorStatus: true,
        label: url,
        maxBytes: RESPONSE_BYTE_LIMIT,
      });
      if (response.ok) {
        if (response.url !== "" && new URL(response.url).protocol !== "https:") {
          throw new Error(`${url} redirected outside HTTPS`);
        }
        return body;
      }
      lastError = new Error(`${url} returned HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < 2) await sleep(1_000 * (2 ** attempt));
  }
  throw lastError ?? new Error(`${url} request failed`);
}

async function requestExaSearch(
  monitor: Extract<NewsMonitor, { kind: "exa-search" }>,
  window: Readonly<{ from: string; through: string }>,
  maxItems: number,
  apiKey: string,
  fetcher: Fetcher,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<unknown> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetcher(EXA_ENDPOINT, {
        body: JSON.stringify({
          ...(monitor.category === null ? {} : { category: monitor.category }),
          endPublishedDate: `${window.through}T23:59:59.999Z`,
          includeDomains: monitor.include_domains,
          moderation: true,
          numResults: Math.min(maxItems, 40),
          query: monitor.query,
          startPublishedDate: `${window.from}T00:00:00.000Z`,
          type: "auto",
        }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(30_000),
      });
      const body = await boundedResponseText(response, {
        allowErrorStatus: true,
        label: EXA_ENDPOINT,
        maxBytes: RESPONSE_BYTE_LIMIT,
      });
      if (response.ok) return JSON.parse(body) as unknown;
      lastError = new Error(`${EXA_ENDPOINT} returned HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < 2) await sleep(1_000 * (2 ** attempt));
  }
  throw lastError ?? new Error(`${EXA_ENDPOINT} request failed`);
}

function gdeltUrl(
  monitor: Extract<NewsMonitor, { kind: "gdelt" }>,
  from: string,
  through: string,
  maxItems: number,
): string {
  const url = new URL(GDELT_ENDPOINT);
  url.searchParams.set("enddatetime", `${through.replaceAll("-", "")}235959`);
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxItems));
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("query", monitor.query);
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("startdatetime", `${from.replaceAll("-", "")}000000`);
  return url.toString();
}

function escapedPattern(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function titleContainsBoundedTerm(title: string, term: string): boolean {
  return new RegExp(
    `(?:^|[^a-z0-9])${escapedPattern(term.toLocaleLowerCase("en-US"))}(?=$|[^a-z0-9])`,
    "u",
  ).test(title.toLocaleLowerCase("en-US"));
}

export function gdeltTitleMatches(
  title: string,
  monitor: Extract<NewsMonitor, { kind: "gdelt" }>,
): boolean {
  if (!monitor.title_any_terms.some((term) => titleContainsBoundedTerm(title, term))) return false;
  if (monitor.title_context_terms === undefined) return true;
  const normalized = title.toLocaleLowerCase("en-US");
  return monitor.title_context_terms.some((term) =>
    normalized.includes(term.toLocaleLowerCase("en-US")));
}

async function collectMonitor(
  monitor: NewsMonitor,
  config: z.infer<typeof NewsMonitorFileSchema>,
  projectDirectory: string,
  window: Readonly<{ from: string; through: string }>,
  knownUrls: ReadonlySet<string>,
  fetcher: Fetcher,
  sleep: (milliseconds: number) => Promise<void>,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<Readonly<{ candidates: readonly CandidateInput[]; warnings: readonly string[] }>> {
  if (monitor.kind === "exa-search") {
    const apiKey = environment.EXA_API_KEY?.trim();
    if (apiKey === undefined || apiKey === "") {
      throw new Error("EXA_API_KEY is not configured");
    }
    return {
      candidates: parseExaCandidates(await requestExaSearch(
        monitor,
        window,
        config.max_items_per_monitor,
        apiKey,
        fetcher,
        sleep,
      ), monitor, await resolvedExaTitleTerms(projectDirectory, monitor)),
      warnings: [],
    };
  }
  if (monitor.kind === "gdelt") {
    const body = await requestText(
      gdeltUrl(monitor, window.from, window.through, config.max_items_per_monitor),
      fetcher,
      sleep,
    );
    return {
      candidates: parseGdeltCandidates(JSON.parse(body)).filter(({ title }) =>
        gdeltTitleMatches(title, monitor)),
      warnings: [],
    };
  }
  const body = await requestText(monitor.url, fetcher, sleep);
  if (monitor.kind === "rss") {
    return { candidates: parseRssCandidates(body, monitor), warnings: [] };
  }

  const links = parseHtmlIndexLinks(body, monitor)
    .filter(({ url }) => !knownUrls.has(url))
    .slice(0, config.max_items_per_monitor);
  const candidates: CandidateInput[] = [];
  const warnings: string[] = [];
  for (const link of links) {
    await sleep(config.minimum_request_interval_ms);
    try {
      const article = parseHtmlArticle(await requestText(link.url, fetcher, sleep));
      if (
        article.publishedAt === undefined
        || !dateInWindow(article.publishedAt, window.from, window.through)
      ) continue;
      candidates.push({
        publishedAt: article.publishedAt,
        source: new URL(link.url).hostname,
        title: article.title ?? link.title,
        url: link.url,
      });
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { candidates, warnings };
}

function mergeCandidate(
  output: Map<string, NewsCandidate>,
  candidate: CandidateInput,
  monitor: NewsMonitor,
): void {
  const existing = output.get(candidate.url);
  if (existing === undefined) {
    output.set(candidate.url, {
      monitors: [monitor.id],
      ...(candidate.publishedAt === undefined ? {} : { publishedAt: candidate.publishedAt }),
      researchAreas: [...monitor.research_areas].toSorted(),
      source: candidate.source,
      title: candidate.title,
      url: candidate.url,
    });
    return;
  }
  output.set(candidate.url, {
    ...existing,
    monitors: [...new Set([...existing.monitors, monitor.id])].toSorted(),
    researchAreas: [...new Set([...existing.researchAreas, ...monitor.research_areas])].toSorted(),
  });
}

function conciseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return cleanText(message).slice(0, 300);
}

function headlineIdentity(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/gu, " ")
    .trim();
}

export async function pullLatestNews(options: PullOptions): Promise<WeeklyNewsDigest> {
  const projectDirectory = resolve(options.projectDirectory ?? process.cwd());
  const asOf = exactIsoDate(options.asOf, "--as-of");
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? sleepFor;
  const environment = options.environment ?? process.env;
  const config = NewsMonitorFileSchema.parse(parse(await readFile(
    join(projectDirectory, "public", "research", "news-monitors.yml"),
    "utf8",
  )) as unknown);
  const sources = ResearchSourceCatalogSchema.parse(parse(await readFile(
    join(projectDirectory, "public", "research", "sources.yml"),
    "utf8",
  )) as unknown);
  const knownUrls = new Set(sources.sources.map(({ url }) => canonicalNewsUrl(url)));
  const requestedMonitorIds = new Set(options.monitorIds ?? []);
  const unknownMonitorIds = [...requestedMonitorIds].filter((id) =>
    !config.monitors.some((monitor) => monitor.id === id));
  if (unknownMonitorIds.length > 0) {
    throw new Error(`Unknown news monitor ID(s): ${unknownMonitorIds.toSorted().join(", ")}`);
  }
  const monitors = requestedMonitorIds.size === 0
    ? config.monitors
    : config.monitors.filter(({ id }) => requestedMonitorIds.has(id));
  const lookbackFrom = options.lookbackFrom === undefined
    ? shiftDate(asOf, -(config.lookback_days - 1))
    : exactIsoDate(options.lookbackFrom, "--from");
  if (lookbackFrom > asOf) throw new Error("--from must not be after --as-of");
  const window = {
    from: lookbackFrom,
    through: asOf,
  };
  const candidates = new Map<string, NewsCandidate>();
  const monitorReports: NewsMonitorReport[] = [];

  for (const monitor of monitors) {
    if (monitorReports.length > 0) await sleep(config.minimum_request_interval_ms);
    try {
      const collected = await collectMonitor(
        monitor,
        config,
        projectDirectory,
        window,
        knownUrls,
        fetcher,
        sleep,
        environment,
      );
      const newCandidates = collected.candidates
        .filter(({ publishedAt }) => dateInWindow(publishedAt, window.from, window.through))
        .filter(({ url }) => !knownUrls.has(url))
        .slice(0, config.max_items_per_monitor);
      for (const candidate of newCandidates) mergeCandidate(candidates, candidate, monitor);
      monitorReports.push({
        candidates: newCandidates.length,
        ...(collected.warnings.length === 0
          ? {}
          : { error: `${collected.warnings.length} article request(s) failed` }),
        id: monitor.id,
        status: collected.warnings.length === 0 ? "ok" : "partial",
      });
    } catch (error) {
      monitorReports.push({
        candidates: 0,
        error: conciseError(error),
        id: monitor.id,
        status: "error",
      });
    }
  }

  const headlineIdentities = new Set<string>();
  const distinctCandidates = [...candidates.values()].filter(({ title }) => {
    const identity = headlineIdentity(title);
    if (headlineIdentities.has(identity)) return false;
    headlineIdentities.add(identity);
    return true;
  });
  const orderedCandidates = distinctCandidates
    .toSorted((left, right) =>
      (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
      || left.title.localeCompare(right.title)
      || left.url.localeCompare(right.url))
    .slice(0, config.max_candidates);
  return {
    asOf,
    candidates: orderedCandidates,
    discoveryPlans: await planHistoryResearchDiscovery(projectDirectory, undefined, asOf),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    lookbackFrom: window.from,
    monitors: monitorReports,
    schema: NEWS_SCHEMA,
  };
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(/([\[\]*_`<>])/gu, "\\$1");
}

export function renderWeeklyNewsMarkdown(digest: WeeklyNewsDigest): string {
  const lines = [
    `# Weekly Stripe history research: ${digest.asOf}`,
    "",
    `Review window: ${digest.lookbackFrom} through ${digest.asOf}.`,
    "",
    "This report contains discovery candidates, not accepted historical facts. Verify significance, canonical identity, publication date, and source evidence before editing the timeline.",
    "",
    `## Review queue (${digest.candidates.length})`,
    "",
  ];
  if (digest.candidates.length === 0) {
    lines.push("No unknown candidate URLs were found.", "");
  } else {
    for (const candidate of digest.candidates) {
      lines.push(
        `- [ ] [${escapeMarkdown(candidate.title)}](${candidate.url})`,
        `  - ${escapeMarkdown(candidate.source)}${candidate.publishedAt === undefined ? "" : ` · ${candidate.publishedAt}`}`,
        `  - Research areas: ${candidate.researchAreas.map(escapeMarkdown).join(", ")}`,
        `  - Found by: ${candidate.monitors.map(escapeMarkdown).join(", ")}`,
      );
    }
    lines.push("");
  }
  lines.push("## Research watermarks", "");
  for (const plan of digest.discoveryPlans) {
    lines.push(
      `- **${escapeMarkdown(plan.collection)}:** reviewed through ${plan.watermark.reviewedThrough}; ${plan.tasks.length} deterministic discovery tasks target ${plan.watermark.targetThrough}.`,
    );
  }
  if (digest.discoveryPlans.length === 0) lines.push("- No incremental collection is behind this date.");
  lines.push("", "## Monitor health", "");
  for (const monitor of digest.monitors) {
    lines.push(
      `- **${escapeMarkdown(monitor.id)}:** ${monitor.status}; ${monitor.candidates} candidate(s)${monitor.error === undefined ? "" : `; ${escapeMarkdown(monitor.error)}`}.`,
    );
  }
  lines.push("", `Generated ${digest.generatedAt}.`);
  return `${lines.join("\n")}\n`;
}

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function flagValues(name: string): readonly string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }
    values.push(value);
  }
  return values;
}

async function writeOutput(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, { encoding: "utf8", mode: 0o600 });
}

if (import.meta.main) {
  const asOf = flagValue("--as-of");
  if (asOf === undefined) throw new Error("--as-of is required");
  const monitorIds = flagValues("--monitor");
  const lookbackFrom = flagValue("--from");
  const digest = await pullLatestNews({
    asOf,
    ...(lookbackFrom === undefined ? {} : { lookbackFrom }),
    ...(monitorIds.length === 0 ? {} : { monitorIds }),
  });
  const json = `${JSON.stringify(digest, null, 2)}\n`;
  const markdown = renderWeeklyNewsMarkdown(digest);
  const jsonOutput = flagValue("--json-out");
  const markdownOutput = flagValue("--markdown-out");
  if (jsonOutput === undefined && markdownOutput === undefined) {
    console.log(json);
  } else {
    if (jsonOutput !== undefined) await writeOutput(jsonOutput, json);
    if (markdownOutput !== undefined) await writeOutput(markdownOutput, markdown);
    console.log(JSON.stringify({
      candidates: digest.candidates.length,
      errors: digest.monitors.filter(({ status }) => status === "error").length,
      successfulMonitors: digest.monitors.filter(({ status }) => status !== "error").length,
    }));
  }
  if (digest.monitors.every(({ status }) => status === "error")) {
    throw new Error("Every weekly news monitor failed");
  }
}
