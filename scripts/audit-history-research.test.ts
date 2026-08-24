import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";

import {
  AutomatedDecisionLedgerSchema,
  AutomatedPublicationLedgerSchema,
} from "../lib/automated-publication-schema";
import {
  auditHistoryResearch,
  planHistoryResearchCaptures,
  planHistoryResearchDiscovery,
} from "./audit-history-research";
import {
  canonicalResearchSourceIdentity,
  canonicalResearchSourceUrl,
  stableResearchSourceId,
} from "../lib/research-source-identity";

const projectDirectory = join(import.meta.dir, "..");
const temporaryRoots: string[] = [];

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .toSorted(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) =>
      `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Cannot hash an undefined test value");
  return serialized;
};

const digestPlanSnapshot = (plan: Readonly<Record<string, unknown>>): string => {
  const snapshot = { ...plan };
  delete snapshot.planSha256;
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, {
    force: true,
    recursive: true,
  })));
});

const temporaryCaptureRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "stripe-capture-plan-"));
  temporaryRoots.push(root);
  return root;
};

const copyResearchProject = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "stripe-research-project-"));
  temporaryRoots.push(root);
  const project = join(root, "stripedex");
  await cp(join(projectDirectory, "public"), join(project, "public"), { recursive: true });
  return project;
};

const copyResearchProjectWithoutEvidence = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "stripe-research-no-evidence-"));
  temporaryRoots.push(root);
  const project = join(root, "stripedex");
  await cp(join(projectDirectory, "public"), join(project, "public"), { recursive: true });
  return project;
};

const installCompleteValuationDiscoveryRun = async (
  project: string,
  targetThrough = "2026-08-13",
): Promise<Readonly<Record<string, unknown>>> => {
  const [plan] = await planHistoryResearchDiscovery(
    project,
    "valuation-history",
    targetThrough,
  );
  if (plan === undefined) throw new Error("Missing valuation discovery plan fixture");
  const collectionsPath = join(project, "public", "research", "collections.yml");
  const runsPath = join(project, "public", "research", "runs.yml");
  const collections = parse(await readFile(collectionsPath, "utf8")) as {
    collections: Array<{ coverage: { through: string }; id: string }>;
  };
  const collection = collections.collections.find(({ id }) => id === "valuation-history");
  if (collection === undefined) throw new Error("Missing valuation collection fixture");
  collection.coverage.through = targetThrough;
  const runs = parse(await readFile(runsPath, "utf8")) as {
    runs: Array<Record<string, unknown>>;
  };
  const completeRun: Readonly<Record<string, unknown>> = {
    collection: "valuation-history",
    completed_on: targetThrough,
    decisions: [],
    kind: "discovery",
    plan,
    recorded_on: targetThrough,
    status: "complete",
    tasks: plan.tasks
      .map(({ id }) => ({
        completed_on: targetThrough,
        decision_ids: [],
        id,
        outcome: "no-candidates",
        status: "complete",
      }))
      .toSorted((left, right) => left.id.localeCompare(right.id)),
  };
  runs.runs.push(completeRun as Record<string, unknown>);
  await Promise.all([
    writeFile(collectionsPath, stringify(collections)),
    writeFile(runsPath, stringify(runs)),
  ]);
  return completeRun;
};

const writeWebCapture = async (
  root: string,
  bundle: string,
  input: {
    readonly canonicalUrl?: string;
    readonly capturedAt?: string;
    readonly evidence?: string;
    readonly evidenceRequested?: "none" | "source";
    readonly finalUrl?: string;
    readonly sourceHtmlPath?: string | null;
    readonly sourceHtmlStatus?: "captured" | "not-requested" | "unavailable";
    readonly sourceUrl: string;
    readonly status: "blocked" | "complete" | "partial";
    readonly writeEvidence?: boolean;
  },
): Promise<void> => {
  const directory = join(root, bundle);
  await mkdir(join(directory, "evidence"), { recursive: true });
  const evidence = input.evidence ?? `evidence for ${bundle}`;
  if (input.writeEvidence !== false) {
    await writeFile(join(directory, "evidence", "source.html"), evidence);
  }
  await writeFile(join(directory, "capture.json"), JSON.stringify({
    acquisition: { finalUrl: input.finalUrl ?? input.sourceUrl },
    canonicalUrl: input.canonicalUrl ?? input.sourceUrl,
    capturedAt: input.capturedAt ?? "2026-08-12T12:00:00.000Z",
    evidence: {
      requested: input.evidenceRequested ?? "source",
      sourceHtmlPath: input.sourceHtmlPath === undefined
        ? "evidence/source.html"
        : input.sourceHtmlPath,
      sourceHtmlStatus: input.sourceHtmlStatus ?? "captured",
    },
    schemaVersion: 3,
    sourceUrl: input.sourceUrl,
    status: input.status,
  }));
};

describe("Stripe history research audit", () => {
  test("validates the complete checked-in corpus with bounded counts", async () => {
    const report = await auditHistoryResearch(projectDirectory);
    const ledger = AutomatedPublicationLedgerSchema.parse(parse(await readFile(
      join(projectDirectory, "public", "research", "automated-publications.yml"),
      "utf8",
    )) as unknown);
    const ledgerDecisions = ledger.runs.reduce(
      (total, run) => total + run.decisions.length,
      0,
    );
    const decisionLedger = AutomatedDecisionLedgerSchema.parse(parse(await readFile(
      join(projectDirectory, "public", "research", "automated-decisions.yml"),
      "utf8",
    )) as unknown);
    const allDecisions = decisionLedger.runs.reduce(
      (total, run) => total + run.decisions.length,
      0,
    );

    expect(report.automatedDecisions).toBe(allDecisions);
    expect(report.automatedDecisionRuns).toBe(decisionLedger.runs.length);
    expect(report.automatedPublicationDecisions).toBe(ledgerDecisions);
    expect(report.automatedPublicationRuns).toBe(ledger.runs.length);
    expect(report.collections).toBe(4);
    expect(report.collectionSupportingSources).toBe(2);
    expect(report.historyFiles).toBe(11);
    expect(report.events).toBeGreaterThan(200);
    expect(report.valuations).toBeGreaterThanOrEqual(25);
    expect(report.appearances).toBe(41);
    expect(report.sources).toBeGreaterThan(250);
    expect(report.datasetReferencedSources).toBeLessThanOrEqual(report.referencedSources);
    expect(report.mutableSourceUrls).toBe(1);
    expect(report.mutableSourceSnapshots).toBe(5);
    expect(report.researchRuns).toBe(6);
    expect(report.referencedSources + report.unreferencedSources).toBe(report.sources);
    expect(report.unreferencedSources).toBe(0);
    expect(report.collectionInputs).toBeGreaterThan(40);
  });

  test("binds incremental coverage to auditable baseline runs", async () => {
    const collectionsPath = join(projectDirectory, "public", "research", "collections.yml");
    const runsPath = join(projectDirectory, "public", "research", "runs.yml");
    const [collectionsText, runsText] = await Promise.all([
      readFile(collectionsPath, "utf8"),
      readFile(runsPath, "utf8"),
    ]);
    const temporaryProject = await copyResearchProject();
    await writeFile(
      join(temporaryProject, "public", "research", "collections.yml"),
      collectionsText.replace("through: 2026-08-12", "through: 2026-08-13"),
    );
    await writeFile(join(temporaryProject, "public", "research", "runs.yml"), runsText);

    expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(
      "coverage through 2026-08-13 lacks a terminal complete run",
    );
  });

  test("keeps completed plan snapshots valid across later strategy evolution", async () => {
    const temporaryProject = await copyResearchProject();
    await installCompleteValuationDiscoveryRun(temporaryProject);
    const collectionsPath = join(temporaryProject, "public", "research", "collections.yml");
    const collections = parse(await readFile(collectionsPath, "utf8")) as {
      collections: Array<{ id: string; query_families: string[] }>;
    };
    const collection = collections.collections.find(({ id }) => id === "valuation-history");
    if (collection === undefined) throw new Error("Missing valuation collection fixture");
    collection.query_families.push("Stripe valuation chronology retrospective evidence");
    await writeFile(collectionsPath, stringify(collections));

    const evolvedReport = await auditHistoryResearch(temporaryProject);
    expect(evolvedReport).toMatchObject({
      researchRuns: 7,
    });

    const [unfinishedPlan] = await planHistoryResearchDiscovery(
      temporaryProject,
      "valuation-history",
      "2026-08-14",
    );
    if (unfinishedPlan === undefined) throw new Error("Missing unfinished discovery plan fixture");
    const runsPath = join(temporaryProject, "public", "research", "runs.yml");
    const runs = parse(await readFile(runsPath, "utf8")) as {
      runs: Array<Record<string, unknown>>;
    };
    runs.runs.push({
      collection: "valuation-history",
      decisions: [],
      kind: "discovery",
      plan: unfinishedPlan,
      recorded_on: "2026-08-13",
      status: "in-progress",
      tasks: unfinishedPlan.tasks
        .map(({ id }) => ({ id, status: "pending" }))
        .toSorted((left, right) => left.id.localeCompare(right.id)),
    });
    await writeFile(runsPath, stringify(runs));
    collection.query_families.push("Stripe future tender and secondary price discovery");
    await writeFile(collectionsPath, stringify(collections));

    await expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(
      "unfinished discovery plan does not match the current strategy",
    );
  });

  test("rejects tampered completed plan content, digest, and task identity", async () => {
    const mutations: ReadonlyArray<Readonly<{
      expected: string;
      mutate: (plan: Record<string, unknown>) => void;
    }>> = [
      {
        expected: "discovery plan digest is invalid",
        mutate: (plan) => {
          const tasks = plan.tasks as Array<Record<string, unknown>>;
          const queryTask = tasks.find(({ kind }) => kind === "query-family");
          if (queryTask === undefined) throw new Error("Missing query task fixture");
          queryTask.query = "tampered historical query";
        },
      },
      {
        expected: "discovery plan digest is invalid",
        mutate: (plan) => {
          plan.planSha256 = "0".repeat(64);
        },
      },
      {
        expected: "discovery task task-00000000000000000000 must use",
        mutate: (plan) => {
          const tasks = plan.tasks as Array<Record<string, unknown>>;
          const first = tasks[0];
          if (first === undefined) throw new Error("Missing discovery task fixture");
          first.id = "task-00000000000000000000";
          plan.planSha256 = digestPlanSnapshot(plan);
        },
      },
    ];
    for (const { expected, mutate } of mutations) {
      const temporaryProject = await copyResearchProject();
      await installCompleteValuationDiscoveryRun(temporaryProject);
      const runsPath = join(temporaryProject, "public", "research", "runs.yml");
      const runs = parse(await readFile(runsPath, "utf8")) as {
        runs: Array<Record<string, unknown>>;
      };
      const run = runs.runs.find((value) =>
        value.kind === "discovery" && value.collection === "valuation-history"
      );
      const plan = run?.plan as Record<string, unknown> | undefined;
      if (plan === undefined) throw new Error("Missing completed plan fixture");
      mutate(plan);
      if (expected.includes("task-")) {
        const tasks = run?.tasks as Array<Record<string, unknown>>;
        const first = tasks[0];
        if (first === undefined) throw new Error("Missing recorded task fixture");
        first.id = "task-00000000000000000000";
      }
      await writeFile(runsPath, stringify(runs));
      await expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(expected);
    }
  });

  test("enforces baseline and completed discovery chronology", async () => {
    const baselineProject = await copyResearchProject();
    const baselineRunsPath = join(baselineProject, "public", "research", "runs.yml");
    const baselineRuns = parse(await readFile(baselineRunsPath, "utf8")) as {
      runs: Array<Record<string, unknown>>;
    };
    baselineRuns.runs[0] = {
      ...baselineRuns.runs[0],
      completed_on: "2026-08-11",
    };
    await writeFile(baselineRunsPath, stringify(baselineRuns));
    await expect(auditHistoryResearch(baselineProject)).rejects.toThrow(
      "Baseline target must not follow its completion date",
    );

    const recordedProject = await copyResearchProject();
    await installCompleteValuationDiscoveryRun(recordedProject);
    const recordedRunsPath = join(recordedProject, "public", "research", "runs.yml");
    const recordedRuns = parse(await readFile(recordedRunsPath, "utf8")) as {
      runs: Array<Record<string, unknown>>;
    };
    const recordedRun = recordedRuns.runs.find(({ collection, kind }) =>
      kind === "discovery" && collection === "valuation-history");
    if (recordedRun === undefined) throw new Error("Missing discovery run fixture");
    recordedRun.recorded_on = "2026-08-14";
    await writeFile(recordedRunsPath, stringify(recordedRuns));
    await expect(auditHistoryResearch(recordedProject)).rejects.toThrow(
      "Discovery run must be recorded by its completion date",
    );

    const targetProject = await copyResearchProject();
    await installCompleteValuationDiscoveryRun(targetProject);
    const targetRunsPath = join(targetProject, "public", "research", "runs.yml");
    const targetRuns = parse(await readFile(targetRunsPath, "utf8")) as {
      runs: Array<Record<string, unknown>>;
    };
    const targetRun = targetRuns.runs.find(({ collection, kind }) =>
      kind === "discovery" && collection === "valuation-history");
    const targetPlan = targetRun?.plan as Record<string, unknown> | undefined;
    const watermark = targetPlan?.watermark as Record<string, unknown> | undefined;
    if (targetPlan === undefined || watermark === undefined) {
      throw new Error("Missing discovery watermark fixture");
    }
    watermark.targetThrough = "2026-08-14";
    targetPlan.planSha256 = digestPlanSnapshot(targetPlan);
    await writeFile(targetRunsPath, stringify(targetRuns));
    await expect(auditHistoryResearch(targetProject)).rejects.toThrow(
      "Discovery target must not follow its completion date",
    );
  });

  test("binds historical backfills to their prior accepted corpus", async () => {
    const temporaryProject = await copyResearchProject();
    const runsPath = join(temporaryProject, "public", "research", "runs.yml");
    const runs = parse(await readFile(runsPath, "utf8")) as {
      runs: Array<Record<string, unknown>>;
    };
    const backfill = runs.runs.find(({ collection, kind }) =>
      kind === "backfill" && collection === "founder-appearances");
    if (backfill === undefined) throw new Error("Missing founder appearance backfill fixture");
    backfill.accepted_input_sha256 = "0".repeat(64);
    await writeFile(runsPath, stringify(runs));

    await expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(
      "founder-appearances backfill accepted-input digest is invalid",
    );
  });

  test("requires complete evidence for every all-accepted input in strict archive mode", async () => {
    const temporaryProject = await copyResearchProject();
    const captureRoot = await temporaryCaptureRoot();
    const evidence = "standalone changelog capture evidence";
    await writeWebCapture(captureRoot, "stripe-changelog-snapshot-2026-08-12", {
      evidence,
      sourceUrl: "https://stripe.com/blog/changelog",
      status: "complete",
    });
    const collectionsPath = join(temporaryProject, "public", "research", "collections.yml");
    const collections = parse(await readFile(collectionsPath, "utf8")) as {
      mutable_sources: Array<{ capture_evidence: { sha256: string } }>;
    };
    const mutable = collections.mutable_sources[0];
    if (mutable === undefined) throw new Error("Missing mutable-source fixture");
    mutable.capture_evidence.sha256 = createHash("sha256").update(evidence).digest("hex");
    const runsPath = join(temporaryProject, "public", "research", "runs.yml");
    const runs = parse(await readFile(runsPath, "utf8")) as {
      runs: Array<{
        decisions?: Array<{
          candidate_url: string;
          evidence?: {
            capture_slug: string;
            captured_on: string;
            sha256: string;
          };
        }>;
      }>;
    };
    for (const run of runs.runs) {
      for (const decision of run.decisions ?? []) {
        if (decision.evidence === undefined) continue;
        const decisionEvidence = `complete evidence for ${decision.candidate_url}`;
        await writeWebCapture(captureRoot, decision.evidence.capture_slug, {
          capturedAt: `${decision.evidence.captured_on}T12:00:00.000Z`,
          evidence: decisionEvidence,
          sourceUrl: decision.candidate_url,
          status: "complete",
        });
        decision.evidence.sha256 = createHash("sha256")
          .update(decisionEvidence)
          .digest("hex");
      }
    }
    await Promise.all([
      writeFile(collectionsPath, stringify(collections)),
      writeFile(runsPath, stringify(runs)),
    ]);

    await expect(auditHistoryResearch(temporaryProject, { captureRoot })).rejects.toThrow(
      "sessions-product-launches all-accepted capture policy requires complete evidence for source-28eaa414dc9531c6df9d",
    );
  });

  test("rejects history collection inputs that no declared output uses", async () => {
    const temporaryProject = await copyResearchProject();
    const collectionsPath = join(temporaryProject, "public", "research", "collections.yml");
    const collections = parse(await readFile(collectionsPath, "utf8")) as {
      collections: Array<{ id: string; input_source_ids: string[] }>;
    };
    const sessions = collections.collections.find(({ id }) =>
      id === "sessions-product-launches"
    );
    if (sessions === undefined) throw new Error("Missing Sessions collection fixture");
    sessions.input_source_ids.push("source-001e51b689b259d0b4e3");
    sessions.input_source_ids.sort();
    await writeFile(collectionsPath, stringify(collections));

    expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(
      "unused history-event input source-001e51b689b259d0b4e3",
    );
  });

  test("requires complete history outputs to declare every cited source", async () => {
    const temporaryProject = await copyResearchProject();
    const collectionsPath = join(temporaryProject, "public", "research", "collections.yml");
    const collections = parse(await readFile(collectionsPath, "utf8")) as {
      collections: Array<{ id: string; input_source_ids: string[] }>;
    };
    const sideProjects = collections.collections.find(({ id }) =>
      id === "founder-side-projects"
    );
    if (sideProjects === undefined) throw new Error("Missing founder side-project collection fixture");
    sideProjects.input_source_ids = [
      "source-4c240f420fc0534fe6af",
      "source-5a2e0ef3c00b4019656f",
    ];
    await writeFile(collectionsPath, stringify(collections));

    expect(auditHistoryResearch(temporaryProject)).rejects.toThrow(
      "founder-side-projects complete output has undeclared source source-605adc8c949c4c2a5e99",
    );
  });

  test("verifies mutable evidence date, status, path, and digest against external archive bytes", async () => {
    const temporaryProject = await copyResearchProject();
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "stripe-changelog-snapshot-2026-08-12", {
      evidence: "tamper-check evidence",
      sourceUrl: "https://stripe.com/blog/changelog",
      status: "complete",
    });
    const collectionsPath = join(temporaryProject, "public", "research", "collections.yml");
    const collections = parse(await readFile(collectionsPath, "utf8")) as {
      mutable_sources: Array<{
        canonical_url: string;
        capture_evidence: { sha256: string };
      }>;
    };
    const changelog = collections.mutable_sources.find(({ canonical_url }) =>
      canonical_url === "https://stripe.com/blog/changelog"
    );
    if (changelog === undefined) throw new Error("Missing mutable changelog fixture");
    changelog.capture_evidence.sha256 = "0".repeat(64);
    await writeFile(collectionsPath, stringify(collections));

    expect(auditHistoryResearch(temporaryProject, { captureRoot })).rejects.toThrow(
      "evidence digest does not match stripe-changelog-snapshot-2026-08-12",
    );
  });

  test("fails closed when strict external capture evidence is absent", async () => {
    const temporaryProject = await copyResearchProjectWithoutEvidence();
    const captureRoot = await temporaryCaptureRoot();

    expect(auditHistoryResearch(temporaryProject, { captureRoot })).rejects.toThrow("ENOENT");
  });

  test("derives stable source IDs from the exact canonical claim key", () => {
    expect(stableResearchSourceId(
      "https://stripe.com/newsroom/news/stripe-2025-update",
      "2026-02-24",
    )).toBe("source-bd6516ac551f19c37d33");
    expect(stableResearchSourceId(
      "https://newaesthetics.art/grants",
      undefined,
    )).toBe("source-5a2e0ef3c00b4019656f");
    expect(stableResearchSourceId(
      "https://marginalrevolution.com/marginalrevolution/2026/05/new-aesthetics-awards.html",
      "2026-05-25",
    )).toBe("source-4c240f420fc0534fe6af");
  });

  test("treats locale-prefixed Stripe routes as the same canonical claim", () => {
    const localized = "https://stripe.com/us/newsroom/news/stripe-2025-update";
    const canonical = "https://stripe.com/newsroom/news/stripe-2025-update";
    expect(canonicalResearchSourceIdentity(localized, "2026-02-24"))
      .toBe(canonicalResearchSourceIdentity(canonical, "2026-02-24"));
    expect(canonicalResearchSourceIdentity(localized, "2025-02-27"))
      .not.toBe(canonicalResearchSourceIdentity(canonical, "2026-02-24"));
    expect(stableResearchSourceId(localized, "2026-02-24"))
      .not.toBe(stableResearchSourceId(canonical, "2026-02-24"));
  });

  test("canonicalizes source URLs idempotently and without query-order drift", () => {
    const first = canonicalResearchSourceUrl(
      "https://www.stripe.com/en-ca/annual-updates/2023?z=2&a=1",
    );
    const second = canonicalResearchSourceUrl(first);
    expect(first).toBe("https://stripe.com/annual-updates/2023?a=1&z=2");
    expect(second).toBe(first);
  });

  test("plans capture inputs deterministically without network access", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("capture planning must not use the network");
    }) as unknown as typeof fetch;
    try {
      const captureRoot = await temporaryCaptureRoot();
      const first = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
        all: true,
        captureRoot,
      });
      const second = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
        all: true,
        captureRoot,
      });
      expect(second).toEqual(first);
      expect(first.length).toBeGreaterThanOrEqual(25);
      expect(new Set(first.map(({ slug }) => slug)).size).toBe(first.length);
      expect(first.some(({ sourceId }) => sourceId === "source-bd6516ac551f19c37d33"))
        .toBe(true);
      expect(first.every(({ collection }) => collection === "valuation-history")).toBe(true);
      expect(first.every(({ captureStatus, reason }) =>
        captureStatus === "missing" && reason === "capture-missing"
      )).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("plans bounded incremental discovery from an explicit persisted watermark", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("discovery planning must not use the network");
    }) as unknown as typeof fetch;
    try {
      const first = await planHistoryResearchDiscovery(
        projectDirectory,
        undefined,
        "2026-09-01",
      );
      const second = await planHistoryResearchDiscovery(
        projectDirectory,
        undefined,
        "2026-09-01",
      );
      expect(second).toEqual(first);
      expect(first.map(({ collection }) => collection)).toEqual([
        "founder-appearances",
        "founder-side-projects",
        "valuation-history",
      ]);
      expect(first.some(({ collection }) => collection === "sessions-product-launches"))
        .toBe(false);
      const founder = first[0];
      expect(founder?.watermark).toEqual({
        lookbackFrom: "2026-04-21",
        reviewedThrough: "2026-08-19",
        targetThrough: "2026-09-01",
      });
      expect(founder?.tasks.some(({ kind }) => kind === "discovery-source")).toBe(true);
      expect(founder?.tasks.some(({ kind }) => kind === "query-family")).toBe(true);
      expect(founder?.schema).toBe("stripe-history/research-discovery-plan/v1");
      expect(founder?.acceptedInputSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(founder?.planSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(founder).toBeDefined();
      if (founder === undefined) throw new Error("Missing founder discovery plan");
      expect(new Set(founder.tasks.map(({ id }) => id)).size).toBe(
        founder.tasks.length,
      );
      expect(founder?.tasks.every(({ id }) => /^task-[a-f0-9]{20}$/u.test(id))).toBe(true);
      expect(founder?.tasks.map(({ kind }) => kind)).toEqual(
        founder?.tasks.map(({ kind }) => kind).toSorted(),
      );
      expect(founder?.dedupeKeys).toContain("native-id");
      expect(founder?.dedupeKeys).toContain("semantic-claim");
      expect(founder?.reviewRequirements).toContain("source-capture-before-acceptance");
      expect(founder?.acceptedSourceIds).toEqual(founder?.acceptedSourceIds.toSorted());
      const sideProjects = first.find(({ collection }) =>
        collection === "founder-side-projects"
      );
      expect(sideProjects?.watermark).toEqual({
        lookbackFrom: "2026-07-10",
        reviewedThrough: "2026-08-24",
        targetThrough: "2026-09-01",
      });
      expect(sideProjects?.tasks.some((task) =>
        task.kind === "discovery-source" && task.url === "https://johncollison.ie/"
      )).toBe(true);
      expect(sideProjects?.tasks.some((task) =>
        task.kind === "discovery-source" && task.url === "https://www.rhinegroup.eu/"
      )).toBe(true);
      expect(sideProjects?.tasks.some((task) =>
        task.kind === "query-family" && task.query === "Patrick Collison project outside Stripe"
      )).toBe(true);
      expect(await planHistoryResearchDiscovery(
        projectDirectory,
        "valuation-history",
        "2026-08-12",
      )).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("requires exact discovery dates and known collections", async () => {
    expect(planHistoryResearchDiscovery(
      projectDirectory,
      "valuation-history",
      "2026-08",
    )).rejects.toThrow("exact ISO date");
    expect(planHistoryResearchDiscovery(
      projectDirectory,
      "valuation-history",
      "2026-02-31",
    )).rejects.toThrow("exact ISO date");
    expect(planHistoryResearchDiscovery(
      projectDirectory,
      "valuation-history",
      "2025-02-29",
    )).rejects.toThrow("exact ISO date");
    expect(planHistoryResearchDiscovery(
      projectDirectory,
      "not-a-collection",
      "2026-09-01",
    )).rejects.toThrow("Unknown research collection");
  });

  test("makes repeat planning a no-op for complete canonical captures", async () => {
    const captureRoot = await temporaryCaptureRoot();
    const evidence = "bounded source evidence";
    await writeWebCapture(captureRoot, "complete", {
      evidence,
      sourceUrl: "https://stripe.com/us/newsroom/news/stripe-2025-update",
      status: "complete",
    });

    const actionable = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    expect(actionable.some(({ sourceId }) => sourceId === "source-bd6516ac551f19c37d33"))
      .toBe(false);

    const inventory = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      all: true,
      captureRoot,
    });
    const captured = inventory.find(
      ({ sourceId }) => sourceId === "source-bd6516ac551f19c37d33",
    );
    expect(captured).toMatchObject({
      captureStatus: "complete",
      evidenceSha256: createHash("sha256").update(evidence).digest("hex"),
      reason: "capture-complete",
      slug: "complete",
    });
    if (captured === undefined) throw new Error("Missing completed capture inventory item");
    const reportedEvidence = await readFile(
      join(captureRoot, captured.slug, "evidence", "source.html"),
    );
    if (captured.evidenceSha256 === undefined) {
      throw new Error("Completed capture inventory item omitted its evidence digest");
    }
    expect(createHash("sha256").update(reportedEvidence).digest("hex"))
      .toBe(captured.evidenceSha256);
    expect(JSON.stringify(captured)).not.toContain(captureRoot);
  });

  test("keeps blocked and partial captures actionable with stable output", async () => {
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "blocked", {
      sourceUrl: "https://stripe.com/newsroom/news/employee-liquidity-feb-2025",
      status: "blocked",
    });
    await writeWebCapture(captureRoot, "partial", {
      sourceUrl: "https://stripe.com/newsroom/news/stripe-series-i-employee-liquidity",
      status: "partial",
    });

    const first = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    const second = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    expect(second).toEqual(first);
    expect(first.find(({ sourceId }) => sourceId === "source-0e881dc1ffda930a1841"))
      .toMatchObject({ captureStatus: "blocked", reason: "capture-blocked" });
    expect(first.find(({ sourceId }) => sourceId === "source-1a020b6076d17a8aecd2"))
      .toMatchObject({ captureStatus: "partial", reason: "capture-partial" });
  });

  test("keeps complete web captures actionable when source evidence was not requested", async () => {
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "no-source-evidence", {
      evidenceRequested: "none",
      sourceHtmlPath: null,
      sourceHtmlStatus: "not-requested",
      sourceUrl: "https://stripe.com/newsroom/news/stripe-2025-update",
      status: "complete",
    });

    const plan = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    expect(plan.find(({ sourceId }) => sourceId === "source-bd6516ac551f19c37d33"))
      .toMatchObject({ captureStatus: "partial", reason: "capture-partial" });
  });

  test("keeps unavailable or pathless source evidence actionable", async () => {
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "unavailable-source-evidence", {
      sourceHtmlPath: null,
      sourceHtmlStatus: "unavailable",
      sourceUrl: "https://stripe.com/newsroom/news/employee-liquidity-feb-2025",
      status: "complete",
    });

    const plan = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    expect(plan.find(({ sourceId }) => sourceId === "source-0e881dc1ffda930a1841"))
      .toMatchObject({ captureStatus: "partial", reason: "capture-partial" });
  });

  test("keeps a captured evidence declaration actionable when its file is missing", async () => {
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "missing-source-evidence", {
      sourceUrl: "https://stripe.com/newsroom/news/stripe-series-i-employee-liquidity",
      status: "complete",
      writeEvidence: false,
    });

    const plan = await planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      captureRoot,
    });
    expect(plan.find(({ sourceId }) => sourceId === "source-1a020b6076d17a8aecd2"))
      .toMatchObject({ captureStatus: "partial", reason: "capture-partial" });
  });

  test("requires PDF source bytes before treating a complete manifest as complete", async () => {
    const captureRoot = await temporaryCaptureRoot();
    const directory = join(captureRoot, "missing-pdf-source");
    await mkdir(directory, { recursive: true });
    const url = "https://www.congress.gov/119/meeting/house/117994/witnesses/HHRG-119-BA00-Wstate-CollisonP-20250311.pdf";
    await writeFile(join(directory, "capture.json"), JSON.stringify({
      capturedAt: "2026-08-12T12:00:00.000Z",
      kind: "pdf",
      schemaVersion: 1,
      source: {
        finalUrl: url,
        path: "source.pdf",
        requestedUrl: url,
      },
      status: "complete",
    }));

    const plan = await planHistoryResearchCaptures(projectDirectory, "founder-appearances", {
      captureRoot,
    });
    expect(plan.find(({ sourceId }) => sourceId === "source-bbf6b0fb0b8942bc569f"))
      .toMatchObject({ captureStatus: "partial", reason: "capture-partial" });
  });

  test("marks fixed-source captures stale from an explicit as-of date", async () => {
    const captureRoot = await temporaryCaptureRoot();
    await writeWebCapture(captureRoot, "sessions", {
      capturedAt: "2024-01-01T12:00:00.000Z",
      sourceUrl: "https://stripe.com/blog/everything-we-announced-at-sessions-2026",
      status: "complete",
    });
    const plan = await planHistoryResearchCaptures(projectDirectory, "sessions-product-launches", {
      asOf: "2026-04-29",
      captureRoot,
    });
    expect(plan.find(({ sourceId }) => sourceId === "source-28eaa414dc9531c6df9d"))
      .toMatchObject({ captureStatus: "complete", reason: "capture-stale" });
  });

  test("rejects impossible calendar days in capture as-of dates", async () => {
    const captureRoot = await temporaryCaptureRoot();
    expect(planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      asOf: "2026-02-31",
      captureRoot,
    })).rejects.toThrow("exact ISO date");
    expect(planHistoryResearchCaptures(projectDirectory, "valuation-history", {
      asOf: "2025-02-29",
      captureRoot,
    })).rejects.toThrow("exact ISO date");
  });

  test("rejects unknown collection filters", async () => {
    expect(planHistoryResearchCaptures(projectDirectory, "not-a-collection"))
      .rejects.toThrow("Unknown research collection");
  });
});
