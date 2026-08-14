import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parse, stringify } from "yaml";

import {
  migrateHistorySources,
  recoverPendingHistorySourceMigration,
  withMigrationOwnershipForTest,
} from "./migrate-history-sources";
import { stableResearchSourceId } from "../lib/research-source-identity";

const roots: string[] = [];
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const TRANSACTION_OWNER_TOKEN = "1234567890abcdef1234567890abcdef";

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
}> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  if (resolvePromise === undefined) throw new Error("Could not create deferred promise");
  return { promise, resolve: resolvePromise };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, {
    force: true,
    recursive: true,
  })));
});

const source = (
  url: string,
  publishedAt?: string,
): Readonly<Record<string, string>> => ({
  kind: "primary",
  publisher: "Stripe",
  ...(publishedAt === undefined ? {} : { published_at: publishedAt }),
  title: "A source with deterministic migration evidence",
  url,
});

async function fixture(
  events: readonly Record<string, unknown>[],
): Promise<Readonly<{ historyPath: string; root: string; sourcesPath: string }>> {
  const root = await mkdtemp(join(tmpdir(), "stripe-history-migration-"));
  roots.push(root);
  const historyDirectory = join(root, "public", "history");
  const researchDirectory = join(root, "public", "research");
  await mkdir(historyDirectory, { recursive: true });
  await mkdir(researchDirectory, { recursive: true });
  const historyPath = join(historyDirectory, "acquisitions.yml");
  const sourcesPath = join(researchDirectory, "sources.yml");
  await writeFile(historyPath, stringify({
    category: {
      description: "Verified acquisition events used by the migration fixture.",
      id: "acquisitions",
      label: "Acquisitions",
      order: 3,
    },
    events,
    schema: "stripe-guide/history/v1",
  }, { lineWidth: 0 }));
  return { historyPath, root, sourcesPath };
}

async function writeResearchFixture(
  files: Readonly<{ root: string; sourcesPath: string }>,
  url: string,
  publishedAt: string,
): Promise<string> {
  const sourceId = stableResearchSourceId(url, publishedAt);
  const researchDirectory = join(files.root, "public", "research");
  await writeFile(files.sourcesPath, stringify({
    schema: "stripe-history/sources/v1",
    sources: [{
      id: sourceId,
      kind: "primary",
      language: "en",
      media_type: "video",
      native_id: "research-only-fixture",
      publisher: "Fixture Research",
      published_at: publishedAt,
      title: "Research-only source that must survive history migration",
      url,
    }],
  }, { lineWidth: 0 }));
  await writeFile(join(researchDirectory, "valuations.yml"), stringify({
    observations: [{
      confidence: "confirmed",
      date_precision: "day",
      effective_date: "2024-01-01",
      id: "valuation-research-only-fixture",
      mechanism: "company-tender",
      source_ids: [sourceId],
      status: "company-confirmed",
      title: "Research fixture values the company at one billion dollars",
      valuation: {
        basis: "transaction-implied",
        currency: "USD",
        display: "$1 billion",
        precision: "exact-stated",
        qualifier: "exact",
        value_usd: 1_000_000_000,
      },
    }],
    schema: "stripe-history/valuations/v1",
  }, { lineWidth: 0 }));
  await writeFile(join(researchDirectory, "appearances.yml"), stringify({
    appearances: [{
      date_precision: "day",
      historical_periods: [],
      id: "appearance-research-only-fixture",
      media: ["video"],
      occurred_at: "2024-01-01",
      participants: [{ name: "Patrick Collison", role: "interviewee" }],
      review_status: "reviewed",
      significance: "This reviewed appearance verifies that research-only catalog entries survive migration.",
      source_ids: [sourceId],
      title: "Research-only migration fixture appearance",
      topics: ["company-building"],
      transcript: { availability: "none" },
      venue: "Fixture Research",
    }],
    schema: "stripe-history/appearances/v1",
  }, { lineWidth: 0 }));
  await writeFile(join(researchDirectory, "collections.yml"), stringify({
    collections: [{
      authority_order: ["primary"],
      capture_policy: "all-accepted",
      coverage: {
        basis: "effective-date",
        from: "2024-01-01",
        through: "2024-01-01",
      },
      dataset: "valuations",
      dedupe_keys: ["canonical-url-published-at"],
      discovery_sources: [url],
      id: "research-only-fixture",
      input_source_ids: [sourceId],
      output_files: ["research/valuations.yml"],
      query_families: ["research-only migration fixture"],
      refresh: {
        cadence: "annual",
        lookback_days: 0,
        minimum_request_interval_ms: 1_000,
        mode: "fixed-source-refetch",
      },
      scope: "Research fixture validating migration catalog preservation.",
      supporting_source_ids: [],
    }],
    mutable_sources: [],
    schema: "stripe-history/research-collections/v1",
  }, { lineWidth: 0 }));
  return sourceId;
}

const event = (
  id: string,
  date: string,
  sources?: readonly Record<string, string>[],
): Record<string, unknown> => ({
  confidence: "confirmed",
  date,
  date_precision: "day",
  id,
  ...(sources === undefined ? {} : { sources }),
  summary: "A migration fixture event with enough context to satisfy the checked history schema.",
  title: `Migration fixture ${id}`,
});

describe("Stripe history source migration", () => {
  test("is dry-run safe and byte-idempotent after the first atomic write", async () => {
    const url = "https://stripe.com/newsroom/news/example-migration";
    const files = await fixture([
      event("example-newer", "2024-01-02", [source(url)]),
      event("example-older", "2024-01-01", [source(url, "2024-01-01")]),
    ]);
    const legacyBytes = await readFile(files.historyPath, "utf8");

    expect(await migrateHistorySources(files.root, false)).toEqual({
      events: 2,
      files: 1,
      sources: 1,
      wrote: false,
    });
    expect(await readFile(files.historyPath, "utf8")).toBe(legacyBytes);
    expect(access(files.sourcesPath)).rejects.toThrow();

    expect((await migrateHistorySources(files.root, true)).wrote).toBe(true);
    const migratedHistory = await readFile(files.historyPath, "utf8");
    const migratedSources = await readFile(files.sourcesPath, "utf8");
    const parsed = parse(migratedHistory) as {
      events: readonly { source_ids: readonly string[] }[];
      schema: string;
    };
    expect(parsed.schema).toBe("stripe-history/history/v2");
    expect(parsed.events[0]?.source_ids).toEqual(parsed.events[1]?.source_ids);

    expect((await migrateHistorySources(files.root, true)).wrote).toBe(false);
    expect(await readFile(files.historyPath, "utf8")).toBe(migratedHistory);
    expect(await readFile(files.sourcesPath, "utf8")).toBe(migratedSources);
  });

  test("fails closed on canonical aliases before writing any output", async () => {
    const files = await fixture([
      event("canonical", "2024-01-02", [source(
        "https://stripe.com/newsroom/news/example-migration",
        "2024-01-01",
      )]),
      event("localized", "2024-01-01", [source(
        "https://www.stripe.com/us/newsroom/news/example-migration",
        "2024-01-01",
      )]),
    ]);
    const legacyBytes = await readFile(files.historyPath, "utf8");

    expect(migrateHistorySources(files.root, true)).rejects.toThrow(
      "canonical-equivalent",
    );
    expect(await readFile(files.historyPath, "utf8")).toBe(legacyBytes);
    expect(access(files.sourcesPath)).rejects.toThrow();
  });

  test("validates every migrated event before the first write", async () => {
    const files = await fixture([
      event("valid", "2024-01-02", [source(
        "https://stripe.com/newsroom/news/example-migration",
        "2024-01-01",
      )]),
      event("missing-source", "2024-01-01"),
    ]);
    const legacyBytes = await readFile(files.historyPath, "utf8");

    expect(migrateHistorySources(files.root, true)).rejects.toThrow();
    expect(await readFile(files.historyPath, "utf8")).toBe(legacyBytes);
    expect(access(files.sourcesPath)).rejects.toThrow();
  });

  test("preserves research-only catalog records and validates every research dataset before writing", async () => {
    const legacyUrl = "https://stripe.com/newsroom/news/legacy-history-source";
    const files = await fixture([
      event("legacy-history", "2024-01-02", [source(legacyUrl, "2024-01-02")]),
    ]);
    const researchId = await writeResearchFixture(
      files,
      "https://www.youtube.com/watch?v=research-only-fixture",
      "2024-01-01",
    );

    expect(await migrateHistorySources(files.root, true)).toEqual({
      events: 1,
      files: 1,
      sources: 2,
      wrote: true,
    });
    const catalog = parse(await readFile(files.sourcesPath, "utf8")) as {
      sources: readonly Record<string, unknown>[];
    };
    expect(catalog.sources.find(({ id }) => id === researchId)).toMatchObject({
      language: "en",
      media_type: "video",
      native_id: "research-only-fixture",
    });
    expect(catalog.sources.map(({ id }) => id)).toContain(
      stableResearchSourceId(legacyUrl, "2024-01-02"),
    );
  });

  test("rejects a research reference outside the merged catalog without changing corpus bytes", async () => {
    const files = await fixture([
      event("legacy-history", "2024-01-02", [source(
        "https://stripe.com/newsroom/news/legacy-history-source",
        "2024-01-02",
      )]),
    ]);
    await writeResearchFixture(
      files,
      "https://www.youtube.com/watch?v=research-only-fixture",
      "2024-01-01",
    );
    const valuationPath = join(files.root, "public", "research", "valuations.yml");
    const valuations = parse(await readFile(valuationPath, "utf8")) as {
      observations: { source_ids: string[] }[];
    };
    const missingId = "source-00000000000000000000";
    const first = valuations.observations[0];
    if (first === undefined) throw new Error("Missing valuation fixture");
    first.source_ids = [missingId];
    await writeFile(valuationPath, stringify({
      ...valuations,
      schema: "stripe-history/valuations/v1",
    }, { lineWidth: 0 }));
    const historyBefore = await readFile(files.historyPath);
    const catalogBefore = await readFile(files.sourcesPath);

    expect(migrateHistorySources(files.root, true)).rejects.toThrow(
      `references missing sources: ${missingId}`,
    );
    expect(await readFile(files.historyPath)).toEqual(historyBefore);
    expect(await readFile(files.sourcesPath)).toEqual(catalogBefore);
  });

  test("recovers an interrupted corpus transaction before a byte-idempotent retry", async () => {
    const files = await fixture([
      event("acquisition", "2024-01-02", [source(
        "https://stripe.com/newsroom/news/acquisition-migration",
        "2024-01-02",
      )]),
    ]);
    const fundraisingPath = join(
      files.root,
      "public",
      "history",
      "fundraising.yml",
    );
    await writeFile(fundraisingPath, stringify({
      category: {
        description: "Verified fundraising events used by the migration fixture.",
        id: "fundraising",
        label: "Fundraising",
        order: 7,
      },
      events: [event("fundraising", "2024-01-01", [source(
        "https://stripe.com/newsroom/news/fundraising-migration",
        "2024-01-01",
      )])],
      schema: "stripe-guide/history/v1",
    }, { lineWidth: 0 }));
    const acquisitionOriginal = await readFile(files.historyPath);
    const fundraisingOriginal = await readFile(fundraisingPath);
    const journal = join(
      files.root,
      "public",
      ".stripe-history-source-migration-v1",
    );
    await mkdir(join(journal, "original", "history"), { recursive: true });
    await writeFile(
      join(journal, "original", "history", "acquisitions.yml"),
      acquisitionOriginal,
    );
    await writeFile(
      join(journal, "original", "history", "fundraising.yml"),
      fundraisingOriginal,
    );
    const interruptedSources = "schema: interrupted\n";
    const interruptedHistory = "schema: interrupted\n";
    await writeFile(files.sourcesPath, interruptedSources);
    await writeFile(files.historyPath, interruptedHistory);
    await writeFile(join(journal, "manifest.json"), JSON.stringify({
      entries: [
        {
          hadOriginal: false,
          nextSha256: sha256(interruptedSources),
          relativePath: "research/sources.yml",
        },
        {
          hadOriginal: true,
          nextSha256: sha256(interruptedHistory),
          originalSha256: sha256(acquisitionOriginal),
          relativePath: "history/acquisitions.yml",
        },
        {
          hadOriginal: true,
          nextSha256: sha256("not-yet-installed"),
          originalSha256: sha256(fundraisingOriginal),
          relativePath: "history/fundraising.yml",
        },
      ],
      ownerToken: TRANSACTION_OWNER_TOKEN,
      schema: "stripe-history/history-source-migration/v1",
    }));
    const staleLock = join(
      files.root,
      "public",
      ".stripe-history-source-migration-lock-v1",
    );
    await mkdir(staleLock);
    await writeFile(join(staleLock, "owner.json"), JSON.stringify({
      pid: 2_147_483_647,
      schema: "stripe-history/history-source-migration-lock/v1",
      token: TRANSACTION_OWNER_TOKEN,
    }));

    expect(await recoverPendingHistorySourceMigration(files.root)).toBe(true);
    expect(await readFile(files.historyPath)).toEqual(acquisitionOriginal);
    expect(await readFile(fundraisingPath)).toEqual(fundraisingOriginal);
    expect(access(files.sourcesPath)).rejects.toThrow();
    expect(access(journal)).rejects.toThrow();

    expect(await migrateHistorySources(files.root, true)).toEqual({
      events: 2,
      files: 2,
      sources: 2,
      wrote: true,
    });
    const migratedAcquisitions = await readFile(files.historyPath, "utf8");
    const migratedFundraising = await readFile(fundraisingPath, "utf8");
    const migratedSources = await readFile(files.sourcesPath, "utf8");
    expect((parse(migratedAcquisitions) as { schema: string }).schema).toBe(
      "stripe-history/history/v2",
    );
    expect((parse(migratedFundraising) as { schema: string }).schema).toBe(
      "stripe-history/history/v2",
    );
    expect((parse(migratedSources) as { sources: unknown[] }).sources).toHaveLength(2);
    expect((await migrateHistorySources(files.root, true)).wrote).toBe(false);
    expect(await readFile(files.historyPath, "utf8")).toBe(migratedAcquisitions);
    expect(await readFile(fundraisingPath, "utf8")).toBe(migratedFundraising);
    expect(await readFile(files.sourcesPath, "utf8")).toBe(migratedSources);
  });

  test("does not recover a live owner's journal during an interleaving", async () => {
    const files = await fixture([
      event("live-owner", "2024-01-01", [source(
        "https://stripe.com/newsroom/news/live-owner",
        "2024-01-01",
      )]),
    ]);
    const publicDirectory = join(files.root, "public");
    const lock = join(publicDirectory, ".stripe-history-source-migration-lock-v1");
    const journal = join(publicDirectory, ".stripe-history-source-migration-v1");
    const interruptedSources = "schema: live-owner\n";
    await mkdir(lock);
    await writeFile(join(lock, "owner.json"), JSON.stringify({
      pid: process.pid,
      schema: "stripe-history/history-source-migration-lock/v1",
      token: TRANSACTION_OWNER_TOKEN,
    }));
    await mkdir(journal);
    await writeFile(files.sourcesPath, interruptedSources);
    await writeFile(join(journal, "manifest.json"), JSON.stringify({
      entries: [{
        hadOriginal: false,
        nextSha256: sha256(interruptedSources),
        relativePath: "research/sources.yml",
      }],
      ownerToken: TRANSACTION_OWNER_TOKEN,
      schema: "stripe-history/history-source-migration/v1",
    }));

    expect(recoverPendingHistorySourceMigration(files.root)).rejects.toThrow(
      `already owned by live process ${process.pid}`,
    );
    expect(await readFile(files.sourcesPath, "utf8")).toBe(interruptedSources);
    await access(join(journal, "manifest.json"));
  });

  test("serializes stale-lock reclamation so a contender cannot remove the new live owner", async () => {
    const files = await fixture([
      event("stale-reclamation", "2024-01-01", [source(
        "https://stripe.com/newsroom/news/stale-reclamation",
        "2024-01-01",
      )]),
    ]);
    const lock = join(
      files.root,
      "public",
      ".stripe-history-source-migration-lock-v1",
    );
    await mkdir(lock);
    await writeFile(join(lock, "owner.json"), JSON.stringify({
      pid: 2_147_483_647,
      schema: "stripe-history/history-source-migration-lock/v1",
      token: TRANSACTION_OWNER_TOKEN,
    }));

    const bothReadStaleOwner = deferred<void>();
    const releaseStaleReaders = deferred<void>();
    const ownerEntered = deferred<string>();
    const releaseOwner = deferred<void>();
    let staleReaders = 0;
    let operationsEntered = 0;
    const contender = async (): Promise<string> =>
      withMigrationOwnershipForTest(files.root, async (token) => {
        operationsEntered += 1;
        ownerEntered.resolve(token);
        await releaseOwner.promise;
        return token;
      }, {
        afterStaleOwnerRead: async (ownerToken) => {
          expect(ownerToken).toBe(TRANSACTION_OWNER_TOKEN);
          staleReaders += 1;
          if (staleReaders === 2) bothReadStaleOwner.resolve();
          await releaseStaleReaders.promise;
        },
      });
    const outcomes = [contender(), contender()].map(async (promise) => {
      try {
        return { status: "fulfilled" as const, value: await promise };
      } catch (error) {
        return { reason: error, status: "rejected" as const };
      }
    });

    await bothReadStaleOwner.promise;
    releaseStaleReaders.resolve();
    const winningToken = await ownerEntered.promise;
    const losingOutcome = await Promise.race(outcomes);
    expect(losingOutcome.status).toBe("rejected");
    if (losingOutcome.status === "rejected") {
      expect(String(losingOutcome.reason)).toMatch(
        /already (?:being reclaimed|owned) by live process/u,
      );
    }
    expect(operationsEntered).toBe(1);
    expect(JSON.parse(await readFile(join(lock, "owner.json"), "utf8"))).toEqual({
      pid: process.pid,
      schema: "stripe-history/history-source-migration-lock/v1",
      token: winningToken,
    });

    releaseOwner.resolve();
    const settled = await Promise.all(outcomes);
    expect(settled.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(settled.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(access(lock)).rejects.toThrow();
  });

  test("recovery fails closed when a target diverges from both transaction digests", async () => {
    const files = await fixture([
      event("cas-recovery", "2024-01-01", [source(
        "https://stripe.com/newsroom/news/cas-recovery",
        "2024-01-01",
      )]),
    ]);
    const journal = join(
      files.root,
      "public",
      ".stripe-history-source-migration-v1",
    );
    const original = await readFile(files.historyPath);
    const installed = Buffer.from("schema: installed\n");
    const concurrentEdit = Buffer.from("schema: independently-edited\n");
    await mkdir(join(journal, "original", "history"), { recursive: true });
    await writeFile(join(journal, "original", "history", "acquisitions.yml"), original);
    await writeFile(files.historyPath, concurrentEdit);
    await writeFile(join(journal, "manifest.json"), JSON.stringify({
      entries: [{
        hadOriginal: true,
        nextSha256: sha256(installed),
        originalSha256: sha256(original),
        relativePath: "history/acquisitions.yml",
      }],
      ownerToken: TRANSACTION_OWNER_TOKEN,
      schema: "stripe-history/history-source-migration/v1",
    }));

    expect(recoverPendingHistorySourceMigration(files.root)).rejects.toThrow(
      "recovery digest precondition failed",
    );
    expect(await readFile(files.historyPath)).toEqual(concurrentEdit);
    await access(join(journal, "manifest.json"));
    expect(access(join(files.root, "public", ".stripe-history-source-migration-lock-v1")))
      .rejects.toThrow();
  });
});
