import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";

import { parse } from "yaml";

import {
  AutomatedDecisionLedgerSchema,
  AutomatedPublicationLedgerSchema,
  AutomatedPublicationPolicySchema,
  type AutomatedDecisionRun,
  type AutomatedPublicationRun,
} from "../lib/automated-publication-schema";
import { HistoryFileSchema, PartialDateSchema } from "../lib/history-schema";
import {
  AppearanceFileSchema,
  ResearchCollectionsFileSchema,
  ResearchRunLedgerSchema,
  ResearchSourceCatalogSchema,
  NetRevenueFileSchema,
  ValuationFileSchema,
  type ResearchCollection,
  type ResearchRun,
  type ResearchSource,
} from "../lib/research-schema";
import {
  canonicalResearchSourceIdentity,
  canonicalResearchSourceUrl,
  stableResearchSourceId,
} from "../lib/research-source-identity";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

export interface ResearchAuditReport {
  readonly appearances: number;
  readonly automatedDecisions: number;
  readonly automatedDecisionRuns: number;
  readonly automatedPublicationDecisions: number;
  readonly automatedPublicationRuns: number;
  readonly collectionInputs: number;
  readonly collectionSupportingSources: number;
  readonly collections: number;
  readonly datasetReferencedSources: number;
  readonly events: number;
  readonly historyFiles: number;
  readonly mutableSourceSnapshots: number;
  readonly mutableSourceUrls: number;
  readonly referencedSources: number;
  readonly researchRuns: number;
  readonly sources: number;
  readonly unreferencedSources: number;
  readonly netRevenues: number;
  readonly valuations: number;
}

export interface ResearchCapturePlanItem {
  readonly captureStatus: "blocked" | "complete" | "missing" | "partial";
  readonly collection: string;
  readonly evidence: "source";
  readonly evidenceSha256?: string;
  readonly media: "images" | "none";
  readonly reason: "capture-blocked" | "capture-complete" | "capture-missing" | "capture-partial" | "capture-stale";
  readonly slug: string;
  readonly sourceId: string;
  readonly url: string;
}

export interface ResearchCapturePlanOptions {
  readonly all?: boolean;
  readonly asOf?: string;
  readonly captureRoot?: string;
}

export interface ResearchAuditOptions {
  /** Optional external capture archive. When present, every declared capture
   * and all-accepted collection input is verified against its retained bytes. */
  readonly captureRoot?: string;
}

export interface ResearchDiscoveryPlan {
  readonly acceptedInputSha256: string;
  readonly acceptedSourceIds: readonly string[];
  readonly authorityOrder: readonly ResearchSource["kind"][];
  readonly collection: string;
  readonly dataset: ResearchCollection["dataset"];
  readonly dedupeKeys: ResearchCollection["dedupe_keys"];
  readonly minimumRequestIntervalMs: number;
  readonly outputFiles: readonly string[];
  readonly planSha256: string;
  readonly reviewRequirements: readonly [
    "canonical-and-native-identity",
    "semantic-claim-deduplication",
    "source-capture-before-acceptance",
    "human-significance-review",
    "advance-watermark-after-complete-review",
  ];
  readonly schema: "stripe-history/research-discovery-plan/v1";
  readonly tasks: readonly (
    | Readonly<{ id: string; kind: "discovery-source"; url: string }>
    | Readonly<{ id: string; kind: "query-family"; query: string }>
  )[];
  readonly watermark: Readonly<{
    lookbackFrom: string;
    reviewedThrough: string;
    targetThrough: string;
  }>;
}

interface CaptureProjection {
  readonly capturedOn: string;
  readonly evidencePath?: string;
  readonly status: "blocked" | "complete" | "partial";
  readonly urls: readonly string[];
}

interface IndexedCapture extends CaptureProjection {
  readonly bundleName: string;
  readonly evidenceSha256?: string;
}

const MAX_CAPTURE_BUNDLES = 2_000;
const MAX_CAPTURE_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 32 * 1024 * 1024;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T/u;
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .toSorted(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) =>
      `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Cannot hash an undefined research value");
  return serialized;
}

const parseYaml = async (path: string): Promise<unknown> =>
  parse(await readFile(path, "utf8")) as unknown;

function assertCanonicalUrlValue(urlValue: string, owner: string): void {
  const url = new URL(urlValue);
  url.searchParams.sort();
  if (url.toString() !== urlValue) {
    throw new Error(`${owner} does not use URL's canonical serialization`);
  }
  for (const key of url.searchParams.keys()) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      throw new Error(`${owner} contains tracking parameter ${key}`);
    }
  }
}

function assertCanonicalUrl(source: ResearchSource): void {
  assertCanonicalUrlValue(source.url, `Source ${source.id}`);
}

function assertDateInCoverage(
  collection: ResearchCollection,
  date: string,
  recordId: string,
): void {
  if (date < collection.coverage.from || date > collection.coverage.through) {
    throw new Error(
      `${collection.id} record ${recordId} date ${date} falls outside declared coverage`,
    );
  }
}

interface LoadedResearch {
  readonly appearances: ReturnType<typeof AppearanceFileSchema.parse>["appearances"];
  readonly automatedDecisionRuns: ReturnType<
    typeof AutomatedDecisionLedgerSchema.parse
  >["runs"];
  readonly automatedPublicationRuns: ReturnType<
    typeof AutomatedPublicationLedgerSchema.parse
  >["runs"];
  readonly collections: ReturnType<typeof ResearchCollectionsFileSchema.parse>["collections"];
  readonly historyFiles: readonly ReturnType<typeof HistoryFileSchema.parse>[];
  readonly mutableSources: ReturnType<
    typeof ResearchCollectionsFileSchema.parse
  >["mutable_sources"];
  readonly publicationPolicy: ReturnType<typeof AutomatedPublicationPolicySchema.parse>;
  readonly researchRuns: ReturnType<typeof ResearchRunLedgerSchema.parse>["runs"];
  readonly netRevenues: ReturnType<typeof NetRevenueFileSchema.parse>["observations"];
  readonly sources: ReturnType<typeof ResearchSourceCatalogSchema.parse>["sources"];
  readonly valuations: ReturnType<typeof ValuationFileSchema.parse>["observations"];
}

async function loadResearch(
  projectDirectory: string,
  options: ResearchAuditOptions = {},
): Promise<LoadedResearch> {
  const historyDirectory = join(projectDirectory, "public", "history");
  const historyNames = (await readdir(historyDirectory))
    .filter((fileName) => fileName.endsWith(".yml"))
    .toSorted();
  const [
    appearances,
    automatedDecisions,
    automatedPublications,
    collections,
    publicationPolicy,
    runs,
    sources,
    netRevenues,
    valuations,
    ...historyValues
  ] = await Promise.all([
    parseYaml(join(projectDirectory, "public", "research", "appearances.yml")),
    parseYaml(join(projectDirectory, "public", "research", "automated-decisions.yml")),
    parseYaml(join(projectDirectory, "public", "research", "automated-publications.yml")),
    parseYaml(join(projectDirectory, "public", "research", "collections.yml")),
    parseYaml(join(projectDirectory, "public", "research", "publication-policy.yml")),
    parseYaml(join(projectDirectory, "public", "research", "runs.yml")),
    parseYaml(join(projectDirectory, "public", "research", "sources.yml")),
    parseYaml(join(projectDirectory, "public", "research", "net-revenue.yml")),
    parseYaml(join(projectDirectory, "public", "research", "valuations.yml")),
    ...historyNames.map((fileName) => parseYaml(join(historyDirectory, fileName))),
  ]);
  const parsedCollections = ResearchCollectionsFileSchema.parse(collections);
  const loaded: LoadedResearch = {
    appearances: AppearanceFileSchema.parse(appearances).appearances,
    automatedDecisionRuns: AutomatedDecisionLedgerSchema.parse(automatedDecisions).runs,
    automatedPublicationRuns: AutomatedPublicationLedgerSchema.parse(
      automatedPublications,
    ).runs,
    collections: parsedCollections.collections,
    historyFiles: historyValues.map((value) => HistoryFileSchema.parse(value)),
    mutableSources: parsedCollections.mutable_sources,
    netRevenues: NetRevenueFileSchema.parse(netRevenues).observations,
    publicationPolicy: AutomatedPublicationPolicySchema.parse(publicationPolicy),
    researchRuns: ResearchRunLedgerSchema.parse(runs).runs,
    sources: ResearchSourceCatalogSchema.parse(sources).sources,
    valuations: ValuationFileSchema.parse(valuations).observations,
  };
  if (options.captureRoot !== undefined) {
    await verifyDeclaredCaptureEvidence(options.captureRoot, loaded);
    await verifyAllAcceptedCapturePolicies(options.captureRoot, loaded);
  }
  return loaded;
}

function verifyMutableSources(
  loaded: LoadedResearch,
  sourceById: ReadonlyMap<string, ResearchSource>,
): Readonly<{ snapshots: number; urls: number }> {
  const reusedByUrl = new Map<string, ResearchSource[]>();
  for (const source of loaded.sources) {
    const canonicalUrl = canonicalResearchSourceUrl(source.url);
    const values = reusedByUrl.get(canonicalUrl) ?? [];
    values.push(source);
    reusedByUrl.set(canonicalUrl, values);
  }
  const reused = new Map(
    [...reusedByUrl].filter(([, sources]) => sources.length > 1),
  );
  const declared = new Map(
    loaded.mutableSources.map((mutableSource) => [
      canonicalResearchSourceUrl(mutableSource.canonical_url),
      mutableSource,
    ]),
  );
  for (const [canonicalUrl, sources] of reused) {
    const declaration = declared.get(canonicalUrl);
    if (declaration === undefined) {
      throw new Error(`Mutable source URL ${canonicalUrl} requires a snapshot declaration`);
    }
    const observedIds = sources.map(({ id }) => id).toSorted();
    if (observedIds.some((id, index) => id !== declaration.source_ids[index])
      || observedIds.length !== declaration.source_ids.length) {
      throw new Error(`Mutable source URL ${canonicalUrl} declaration must list every snapshot`);
    }
    const publishedDates = sources.map(({ published_at: date }) => date);
    if (publishedDates.some((date) => date === undefined)
      || new Set(publishedDates).size !== publishedDates.length) {
      throw new Error(`Mutable source URL ${canonicalUrl} snapshots require unique dates`);
    }
  }
  for (const [canonicalUrl, declaration] of declared) {
    if (!reused.has(canonicalUrl)) {
      throw new Error(`Mutable source declaration ${canonicalUrl} does not describe URL reuse`);
    }
    for (const sourceId of declaration.source_ids) {
      if (!sourceById.has(sourceId)) {
        throw new Error(`Mutable source declaration ${canonicalUrl} references missing ${sourceId}`);
      }
    }
  }
  return {
    snapshots: [...reused.values()].reduce((total, sources) => total + sources.length, 0),
    urls: reused.size,
  };
}

function verifySources(sources: readonly ResearchSource[]): Map<string, ResearchSource> {
  const byId = new Map<string, ResearchSource>();
  const canonicalIdentities = new Map<string, string>();
  const nativeIds = new Map<string, string>();
  for (const source of sources) {
    assertCanonicalUrl(source);
    const expectedId = stableResearchSourceId(source.url, source.published_at);
    if (source.id !== expectedId) {
      throw new Error(`Source ${source.id} must use stable ID ${expectedId}`);
    }
    const identity = canonicalResearchSourceIdentity(source.url, source.published_at);
    const duplicateId = canonicalIdentities.get(identity);
    if (duplicateId !== undefined) {
      throw new Error(
        `Sources ${duplicateId} and ${source.id} are canonical-equivalent; keep one canonical URL`,
      );
    }
    canonicalIdentities.set(identity, source.id);
    if (source.native_id !== undefined) {
      const nativeKey = `${source.media_type}:${source.native_id}`;
      const nativeDuplicate = nativeIds.get(nativeKey);
      if (nativeDuplicate !== undefined) {
        throw new Error(`Sources ${nativeDuplicate} and ${source.id} share native ID ${nativeKey}`);
      }
      nativeIds.set(nativeKey, source.id);
    }
    byId.set(source.id, source);
  }
  return byId;
}

function verifyReference(
  sourceId: string,
  sourceById: ReadonlyMap<string, ResearchSource>,
  referenced: Set<string>,
  owner: string,
): void {
  if (!sourceById.has(sourceId)) {
    throw new Error(`${owner} references missing source ${sourceId}`);
  }
  referenced.add(sourceId);
}

function verifyCollection(
  collection: ResearchCollection,
  loaded: LoadedResearch,
  sourceById: ReadonlyMap<string, ResearchSource>,
): void {
  const knownOutputs = new Set([
    "research/appearances.yml",
    "research/valuations.yml",
    ...loaded.historyFiles.map(({ category }) => `history/${category.id}.yml`),
  ]);
  for (const output of collection.output_files) {
    if (!knownOutputs.has(output)) {
      throw new Error(`${collection.id} declares unknown output ${output}`);
    }
  }
  for (const [index, url] of collection.discovery_sources.entries()) {
    assertCanonicalUrlValue(url, `${collection.id} discovery source ${index}`);
  }
  const allowedKinds = new Set(collection.authority_order);
  for (const sourceId of collection.input_source_ids) {
    const source = sourceById.get(sourceId);
    if (source === undefined) throw new Error(`${collection.id} input ${sourceId} is missing`);
    if (!allowedKinds.has(source.kind)) {
      throw new Error(`${collection.id} input ${sourceId} violates its authority order`);
    }
  }
  for (const sourceId of collection.supporting_source_ids) {
    const source = sourceById.get(sourceId);
    if (source === undefined) throw new Error(`${collection.id} supporting input ${sourceId} is missing`);
    if (!allowedKinds.has(source.kind)) {
      throw new Error(`${collection.id} supporting input ${sourceId} violates its authority order`);
    }
  }
  if (collection.dataset === "valuations") {
    if (collection.supporting_source_ids.length !== 0) {
      throw new Error(`${collection.id} valuations do not allow supporting-only inputs`);
    }
    if (collection.output_files.length !== 1
      || collection.output_files[0] !== "research/valuations.yml") {
      throw new Error(`${collection.id} valuation output must be research/valuations.yml`);
    }
    const observed = new Set<string>();
    for (const valuation of loaded.valuations) {
      assertDateInCoverage(collection, valuation.effective_date, valuation.id);
      for (const sourceId of valuation.source_ids) observed.add(sourceId);
    }
    const declared = new Set(collection.input_source_ids);
    for (const sourceId of observed) {
      if (!declared.has(sourceId)) throw new Error(`${collection.id} omits input ${sourceId}`);
    }
    for (const sourceId of declared) {
      if (!observed.has(sourceId)) throw new Error(`${collection.id} has unused input ${sourceId}`);
    }
  } else if (collection.dataset === "appearances") {
    if (collection.supporting_source_ids.length !== 0) {
      throw new Error(`${collection.id} appearances do not allow supporting-only inputs`);
    }
    if (collection.output_files.length !== 1
      || collection.output_files[0] !== "research/appearances.yml") {
      throw new Error(`${collection.id} appearance output must be research/appearances.yml`);
    }
    const observed = new Set<string>();
    const reviewedLeadership = new Set([
      "John Collison",
      "Patrick Collison",
      ...loaded.historyFiles
        .filter(({ category }) => category.id === "executives-and-team")
        .flatMap(({ events }) => events.flatMap(({ people }) => people ?? [])),
    ]);
    for (const appearance of loaded.appearances) {
      assertDateInCoverage(collection, appearance.occurred_at, appearance.id);
      for (const participant of appearance.participants) {
        if (!reviewedLeadership.has(participant.name)) {
          throw new Error(
            `${collection.id} appearance ${appearance.id} has undeclared leadership participant ${participant.name}`,
          );
        }
      }
      for (const sourceId of appearance.source_ids) observed.add(sourceId);
    }
    const declared = new Set(collection.input_source_ids);
    for (const sourceId of observed) {
      if (!declared.has(sourceId)) throw new Error(`${collection.id} omits input ${sourceId}`);
    }
    for (const sourceId of declared) {
      if (!observed.has(sourceId)) throw new Error(`${collection.id} has unused input ${sourceId}`);
    }
  } else {
    if (collection.output_files.some((path) => !path.startsWith("history/"))) {
      throw new Error(`${collection.id} history-event outputs must be history YAML files`);
    }
    const inputs = new Set(collection.input_source_ids);
    const outputCategories = new Set(
      collection.output_files.map((path) => path.slice("history/".length, -".yml".length)),
    );
    const outputEvents = loaded.historyFiles
      .filter(({ category }) => outputCategories.has(category.id))
      .flatMap(({ events }) => events);
    const matching = collection.history_output_coverage === "complete-output"
      ? outputEvents
      : outputEvents.filter(
          ({ source_ids: sourceIds }) => sourceIds.some((sourceId) => inputs.has(sourceId)),
        );
    if (matching.length === 0) throw new Error(`${collection.id} has no matching history events`);
    const observed = new Set<string>();
    for (const event of matching) {
      assertDateInCoverage(collection, event.date, event.id);
      for (const sourceId of event.source_ids) {
        if (collection.history_output_coverage === "complete-output" || inputs.has(sourceId)) {
          observed.add(sourceId);
        }
      }
    }
    if (collection.history_output_coverage === "complete-output") {
      for (const sourceId of observed) {
        if (!inputs.has(sourceId)) {
          throw new Error(`${collection.id} complete output has undeclared source ${sourceId}`);
        }
      }
    }
    for (const sourceId of inputs) {
      if (!observed.has(sourceId)) {
        throw new Error(`${collection.id} has unused history-event input ${sourceId}`);
      }
    }
    for (const sourceId of collection.supporting_source_ids) {
      if (outputEvents.some((event) => event.source_ids.includes(sourceId))) {
        throw new Error(`${collection.id} supporting input ${sourceId} must be a matching input`);
      }
    }
  }
}

const sameValues = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

function baselinePlanPayload(
  collection: ResearchCollection,
  acceptedSourceIds: readonly string[],
  targetThrough: string,
): Readonly<Record<string, unknown>> {
  return {
    acceptedInputSha256: sha256(canonicalJson(acceptedSourceIds)),
    acceptedSourceIds,
    collection: collection.id,
    dataset: collection.dataset,
    schema: "stripe-history/research-baseline-import/v1",
    targetThrough,
  };
}

function backfillPlanPayload(
  collection: ResearchCollection,
  acceptedSourceIds: readonly string[],
  artifactUrl: string,
  reviewWindow: Readonly<{ from: string; through: string }>,
): Readonly<Record<string, unknown>> {
  return {
    acceptedInputSha256: sha256(canonicalJson(acceptedSourceIds)),
    acceptedSourceIds,
    artifactUrl,
    collection: collection.id,
    dataset: collection.dataset,
    reviewWindow,
    schema: "stripe-history/research-backfill-plan/v1",
  };
}

export function stableCandidateDecisionId(
  collection: string,
  planSha256: string,
  candidateUrl: string,
  nativeId: string | undefined,
): string {
  return `candidate-${sha256(canonicalJson([
    collection,
    planSha256,
    canonicalCaptureUrl(candidateUrl),
    nativeId ?? null,
  ])).slice(0, 20)}`;
}

function discoveryTaskValue(
  task: ResearchDiscoveryPlan["tasks"][number],
): string {
  return task.kind === "discovery-source" ? task.url : task.query;
}

function verifyDiscoveryPlanSnapshot(plan: ResearchDiscoveryPlan): void {
  if (!sameValues(plan.acceptedSourceIds, plan.acceptedSourceIds.toSorted())) {
    throw new Error(`${plan.collection} discovery inputs must be sorted`);
  }
  if (new Set(plan.acceptedSourceIds).size !== plan.acceptedSourceIds.length) {
    throw new Error(`${plan.collection} discovery inputs must be unique`);
  }
  const expectedAcceptedDigest = sha256(canonicalJson(plan.acceptedSourceIds));
  if (plan.acceptedInputSha256 !== expectedAcceptedDigest) {
    throw new Error(`${plan.collection} discovery accepted-input digest is invalid`);
  }
  const { planSha256, ...snapshot } = plan;
  const expectedPlanDigest = sha256(canonicalJson(snapshot));
  if (planSha256 !== expectedPlanDigest) {
    throw new Error(`${plan.collection} discovery plan digest is invalid`);
  }
  if (plan.watermark.lookbackFrom > plan.watermark.reviewedThrough) {
    throw new Error(`${plan.collection} discovery lookback follows its reviewed watermark`);
  }
  if (plan.watermark.targetThrough <= plan.watermark.reviewedThrough) {
    throw new Error(`${plan.collection} discovery target must follow its reviewed watermark`);
  }
  const orderedTasks = plan.tasks.toSorted((left, right) =>
    left.kind.localeCompare(right.kind)
      || discoveryTaskValue(left).localeCompare(discoveryTaskValue(right))
  );
  if (plan.tasks.some(({ id }, index) => id !== orderedTasks[index]?.id)) {
    throw new Error(`${plan.collection} discovery plan tasks must use deterministic order`);
  }
  const taskIds = new Set<string>();
  const taskInputs = new Set<string>();
  for (const task of plan.tasks) {
    if (task.kind === "discovery-source") {
      assertCanonicalUrlValue(task.url, `${plan.collection} discovery task ${task.id}`);
    }
    const input = discoveryTaskValue(task);
    const expectedId = stableDiscoveryTaskId(
      plan.collection,
      task.kind,
      input,
      plan.watermark.lookbackFrom,
      plan.watermark.targetThrough,
    );
    if (task.id !== expectedId) {
      throw new Error(`${plan.collection} discovery task ${task.id} must use ${expectedId}`);
    }
    if (taskIds.has(task.id) || taskInputs.has(`${task.kind}:${input}`)) {
      throw new Error(`${plan.collection} discovery plan tasks must be unique`);
    }
    taskIds.add(task.id);
    taskInputs.add(`${task.kind}:${input}`);
  }
}

function verifyDiscoveryRun(
  run: Extract<ResearchRun, { kind: "discovery" }>,
  collection: ResearchCollection,
  sourceById: ReadonlyMap<string, ResearchSource>,
): void {
  if (run.collection !== run.plan.collection || run.collection !== collection.id) {
    throw new Error(`Discovery run ${run.plan.planSha256} has inconsistent collection identity`);
  }
  verifyDiscoveryPlanSnapshot(run.plan);
  if (run.status !== "complete") {
    const expectedPlan = buildDiscoveryPlan(
      collection,
      run.plan.acceptedSourceIds,
      run.plan.watermark.reviewedThrough,
      run.plan.watermark.targetThrough,
    );
    if (canonicalJson(run.plan) !== canonicalJson(expectedPlan)) {
      throw new Error(
        `${collection.id} unfinished discovery plan does not match the current strategy`,
      );
    }
  }
  const plannedTaskIds = run.plan.tasks.map(({ id }) => id);
  const recordedTaskIds = run.tasks.map(({ id }) => id);
  if (!sameValues(recordedTaskIds.toSorted(), plannedTaskIds.toSorted())) {
    throw new Error(`${collection.id} discovery run must record every planned task exactly once`);
  }
  if (run.status === "complete" && run.tasks.some(({ status }) => status !== "complete")) {
    throw new Error(`${collection.id} complete discovery run has unfinished tasks`);
  }
  if (run.status === "blocked" && run.tasks.every(({ status }) => status !== "blocked")) {
    throw new Error(`${collection.id} blocked discovery run must identify a blocked task`);
  }

  const decisionsById = new Map(run.decisions.map((decision) => [
    decision.candidate_id,
    decision,
  ]));
  const decisionsUsedByTasks = new Set<string>();
  for (const task of run.tasks) {
    if (task.status !== "complete") continue;
    for (const decisionId of task.decision_ids) {
      const decision = decisionsById.get(decisionId);
      if (decision === undefined) {
        throw new Error(`${collection.id} task ${task.id} references missing ${decisionId}`);
      }
      if (!decision.task_ids.includes(task.id)) {
        throw new Error(`${collection.id} decision ${decisionId} omits task ${task.id}`);
      }
      decisionsUsedByTasks.add(decisionId);
    }
  }
  for (const decision of run.decisions) {
    assertCanonicalUrlValue(decision.candidate_url, `${collection.id} ${decision.candidate_id}`);
    const expectedId = stableCandidateDecisionId(
      collection.id,
      run.plan.planSha256,
      decision.candidate_url,
      decision.native_id,
    );
    if (decision.candidate_id !== expectedId) {
      throw new Error(`${collection.id} candidate ${decision.candidate_id} must use ${expectedId}`);
    }
    if (!decisionsUsedByTasks.has(decision.candidate_id)) {
      throw new Error(`${collection.id} decision ${decision.candidate_id} is not linked by a task`);
    }
    for (const taskId of decision.task_ids) {
      const task = run.tasks.find(({ id }) => id === taskId);
      if (task?.status !== "complete" || !task.decision_ids.includes(decision.candidate_id)) {
        throw new Error(`${collection.id} decision ${decision.candidate_id} has invalid task ${taskId}`);
      }
    }
    if (decision.disposition === "accepted") {
      const source = sourceById.get(decision.source_id);
      if (source === undefined) {
        throw new Error(`${collection.id} accepted candidate references missing ${decision.source_id}`);
      }
      if (canonicalCaptureUrl(source.url) !== canonicalCaptureUrl(decision.candidate_url)) {
        throw new Error(`${collection.id} accepted candidate URL does not match ${decision.source_id}`);
      }
      if (decision.evidence.status !== "complete") {
        throw new Error(`${collection.id} accepted candidate requires complete capture evidence`);
      }
    } else if (decision.disposition === "duplicate") {
      if (!sourceById.has(decision.duplicate_of_source_id)) {
        throw new Error(
          `${collection.id} duplicate candidate references missing ${decision.duplicate_of_source_id}`,
        );
      }
    }
  }
}

function verifyBackfillRun(
  run: Extract<ResearchRun, { kind: "backfill" }>,
  collection: ResearchCollection,
  sourceById: ReadonlyMap<string, ResearchSource>,
): void {
  if (run.collection !== collection.id) {
    throw new Error(`Backfill run ${run.plan_sha256} has inconsistent collection identity`);
  }
  if (run.review_window.through > collection.coverage.through) {
    throw new Error(`${collection.id} backfill review exceeds collection coverage`);
  }
  const expectedAcceptedDigest = sha256(canonicalJson(run.accepted_source_ids));
  if (run.accepted_input_sha256 !== expectedAcceptedDigest) {
    throw new Error(`${collection.id} backfill accepted-input digest is invalid`);
  }
  const expectedPlanDigest = sha256(canonicalJson(backfillPlanPayload(
    collection,
    run.accepted_source_ids,
    run.artifact_url,
    run.review_window,
  )));
  if (run.plan_sha256 !== expectedPlanDigest) {
    throw new Error(`${collection.id} backfill plan digest is invalid`);
  }
  assertCanonicalUrlValue(run.artifact_url, `${collection.id} backfill artifact`);
  for (const sourceId of run.accepted_source_ids) {
    if (!sourceById.has(sourceId)) {
      throw new Error(`${collection.id} backfill input references missing ${sourceId}`);
    }
  }
  for (const decision of run.decisions) {
    assertCanonicalUrlValue(decision.candidate_url, `${collection.id} ${decision.candidate_id}`);
    const expectedId = stableCandidateDecisionId(
      collection.id,
      run.plan_sha256,
      decision.candidate_url,
      decision.native_id,
    );
    if (decision.candidate_id !== expectedId) {
      throw new Error(`${collection.id} candidate ${decision.candidate_id} must use ${expectedId}`);
    }
    if (decision.disposition === "accepted") {
      const source = sourceById.get(decision.source_id);
      if (source === undefined) {
        throw new Error(`${collection.id} accepted candidate references missing ${decision.source_id}`);
      }
      if (canonicalCaptureUrl(source.url) !== canonicalCaptureUrl(decision.candidate_url)) {
        throw new Error(`${collection.id} accepted candidate URL does not match ${decision.source_id}`);
      }
      if (decision.evidence.status !== "complete") {
        throw new Error(`${collection.id} accepted candidate requires complete capture evidence`);
      }
    } else if (decision.disposition === "duplicate") {
      if (!sourceById.has(decision.duplicate_of_source_id)) {
        throw new Error(
          `${collection.id} duplicate candidate references missing ${decision.duplicate_of_source_id}`,
        );
      }
    }
  }
}

function verifyResearchRuns(
  loaded: LoadedResearch,
  sourceById: ReadonlyMap<string, ResearchSource>,
): void {
  const collectionById = new Map(loaded.collections.map((collection) => [
    collection.id,
    collection,
  ]));
  for (const run of loaded.researchRuns) {
    const collection = collectionById.get(run.collection);
    if (collection === undefined) throw new Error(`Research run references unknown ${run.collection}`);
    if (collection.refresh.mode !== "incremental-discovery") {
      throw new Error(`${collection.id} does not accept discovery-run ledger entries`);
    }
    if (run.kind === "discovery") verifyDiscoveryRun(run, collection, sourceById);
    if (run.kind === "backfill") verifyBackfillRun(run, collection, sourceById);
  }

  for (const collection of loaded.collections) {
    if (collection.refresh.mode !== "incremental-discovery") continue;
    const runs = loaded.researchRuns.filter((run) => run.collection === collection.id);
    const completeRuns = runs
      .filter((run) => run.status === "complete")
      .toSorted((left, right) => {
        const target = (run: ResearchRun): string => {
          if (run.kind === "baseline-import") return run.target_through;
          if (run.kind === "discovery") return run.plan.watermark.targetThrough;
          return run.completed_on;
        };
        const rank = (run: ResearchRun): number => {
          if (run.kind === "baseline-import") return 0;
          if (run.kind === "discovery") return 1;
          return 2;
        };
        const digest = (run: ResearchRun): string => run.kind === "discovery"
          ? run.plan.planSha256
          : run.plan_sha256;
        return target(left).localeCompare(target(right))
          || rank(left) - rank(right)
          || digest(left).localeCompare(digest(right));
      });
    const baselineRuns = completeRuns.filter((run) => run.kind === "baseline-import");
    if (baselineRuns.length !== 1 || completeRuns[0]?.kind !== "baseline-import") {
      throw new Error(`${collection.id} requires one first complete baseline-import run`);
    }
    const baseline = completeRuns[0];
    if (baseline === undefined || baseline.kind !== "baseline-import") {
      throw new Error(`${collection.id} baseline import is unavailable`);
    }
    const imported = baseline.imported_source_ids;
    if (!sameValues(imported, imported.toSorted())) {
      throw new Error(`${collection.id} baseline source IDs must be sorted`);
    }
    const acceptedInputSha256 = sha256(canonicalJson(imported));
    if (baseline.accepted_input_sha256 !== acceptedInputSha256) {
      throw new Error(`${collection.id} baseline accepted-input digest is invalid`);
    }
    const expectedBaselineSha = sha256(canonicalJson(
      baselinePlanPayload(collection, imported, baseline.target_through),
    ));
    if (baseline.plan_sha256 !== expectedBaselineSha) {
      throw new Error(`${collection.id} baseline plan digest is invalid`);
    }
    for (const sourceId of imported) {
      if (!sourceById.has(sourceId)) {
        throw new Error(`${collection.id} baseline references missing ${sourceId}`);
      }
    }

    let acceptedSourceIds = [...imported];
    let reviewedThrough = baseline.target_through;
    for (const run of completeRuns.slice(1)) {
      if (run.kind === "baseline-import") {
        throw new Error(`${collection.id} cannot contain a second baseline import`);
      }
      const runAcceptedSourceIds = run.kind === "discovery"
        ? run.plan.acceptedSourceIds
        : run.accepted_source_ids;
      if (!sameValues(runAcceptedSourceIds, acceptedSourceIds)) {
        const label = run.kind === "discovery" ? "discovery" : "backfill";
        throw new Error(`${collection.id} ${label} inputs do not match the prior complete run`);
      }
      if (run.kind === "discovery" && run.plan.watermark.reviewedThrough !== reviewedThrough) {
        throw new Error(`${collection.id} complete discovery runs must form a watermark chain`);
      }
      acceptedSourceIds = [
        ...acceptedSourceIds,
        ...run.decisions.flatMap((decision) =>
          decision.disposition === "accepted" ? [decision.source_id] : []),
      ].toSorted();
      if (new Set(acceptedSourceIds).size !== acceptedSourceIds.length) {
        throw new Error(`${collection.id} complete run re-accepts an existing source`);
      }
      if (run.kind === "discovery") reviewedThrough = run.plan.watermark.targetThrough;
    }
    if (reviewedThrough !== collection.coverage.through) {
      throw new Error(
        `${collection.id} coverage through ${collection.coverage.through} lacks a terminal complete run`,
      );
    }
    if (!sameValues(acceptedSourceIds, collection.input_source_ids)) {
      throw new Error(`${collection.id} inputs do not match its terminal complete run`);
    }
    for (const run of runs) {
      if (run.kind !== "discovery" || run.status === "complete") continue;
      if (run.plan.watermark.reviewedThrough !== reviewedThrough
        || !sameValues(run.plan.acceptedSourceIds, acceptedSourceIds)) {
        throw new Error(`${collection.id} unfinished run is not based on the terminal watermark`);
      }
    }
  }
}

function automatedPublicationRunId(run: AutomatedPublicationRun): string {
  const decisions = run.decisions.map((decision) => ({
    candidateUrl: decision.candidate_url,
    category: decision.category,
    disposition: decision.disposition,
    evidenceQuoteDigests: decision.evidence_quote_sha256,
    evidenceSha256: decision.evidence_sha256,
    eventId: decision.event_id,
    proposalSha256: decision.proposal_sha256,
    reviewSha256: decision.review_sha256,
    sourceId: decision.source_id,
  }));
  return `publication-${sha256(canonicalJson({
    asOf: run.published_on,
    candidateDigest: run.candidate_digest_sha256,
    decisions,
    model: run.model,
  })).slice(0, 20)}`;
}

function verifyAutomatedPublicationRuns(
  loaded: LoadedResearch,
  sourceById: ReadonlyMap<string, ResearchSource>,
): number {
  const policy = loaded.publicationPolicy;
  const historyByCategory = new Map(loaded.historyFiles.map((history) => [
    history.category.id,
    history,
  ]));
  const seenCandidateUrls = new Set<string>();
  const seenSourceIds = new Set<string>();
  const proposalPromptVersions = new Set([
    policy.proposal_prompt_version,
    ...policy.historical_proposal_prompt_versions,
  ]);
  const reviewPromptVersions = new Set([
    policy.review_prompt_version,
    ...policy.historical_review_prompt_versions,
  ]);
  let decisions = 0;

  for (const run of loaded.automatedPublicationRuns) {
    if (
      run.model !== policy.model
      || run.reasoning_effort !== policy.reasoning_effort
      || !proposalPromptVersions.has(run.proposal_prompt_version)
      || !reviewPromptVersions.has(run.review_prompt_version)
    ) {
      throw new Error(`${run.id} does not match the versioned automatic publication policy`);
    }
    if (run.decisions.length > policy.max_publications_per_run) {
      throw new Error(`${run.id} exceeds the automatic publication limit`);
    }
    const expectedRunId = automatedPublicationRunId(run);
    if (run.id !== expectedRunId) {
      throw new Error(`Automatic publication run ${run.id} must use ${expectedRunId}`);
    }

    for (const decision of run.decisions) {
      decisions += 1;
      assertCanonicalUrlValue(
        decision.candidate_url,
        `${run.id} candidate ${decision.source_id}`,
      );
      if (seenCandidateUrls.has(decision.candidate_url)) {
        throw new Error(`Automatic publication candidate ${decision.candidate_url} is repeated`);
      }
      seenCandidateUrls.add(decision.candidate_url);
      if (seenSourceIds.has(decision.source_id)) {
        throw new Error(`Automatic publication source ${decision.source_id} is repeated`);
      }
      seenSourceIds.add(decision.source_id);
      if (!policy.auto_publish_categories.includes(decision.category)) {
        throw new Error(`${run.id} published outside the automatic category allowlist`);
      }

      const source = sourceById.get(decision.source_id);
      if (source === undefined) {
        throw new Error(`${run.id} references missing source ${decision.source_id}`);
      }
      if (source.published_at !== undefined && source.published_at > run.published_on) {
        throw new Error(`${run.id} references a source published after the run`);
      }
      const history = historyByCategory.get(decision.category);
      const event = history?.events.find(({ id }) => id === decision.event_id);
      if (event === undefined) {
        throw new Error(
          `${run.id} references missing ${decision.category} event ${decision.event_id}`,
        );
      }
      if (!event.source_ids.includes(decision.source_id)) {
        throw new Error(`${run.id} source ${decision.source_id} is absent from ${event.id}`);
      }
      if (
        decision.disposition === "published-new-event"
        && event.date > run.published_on
      ) {
        throw new Error(`${run.id} published future event ${event.id}`);
      }
    }
  }
  return decisions;
}

function automatedDecisionRunId(run: AutomatedDecisionRun): string {
  return `decision-run-${sha256(canonicalJson({
    asOf: run.decided_on,
    candidateDigest: run.candidate_digest_sha256,
    decisions: run.decisions,
    model: run.model,
    proposalPromptVersion: run.proposal_prompt_version,
    reasoningEffort: run.reasoning_effort,
    reviewPromptVersion: run.review_prompt_version,
  })).slice(0, 20)}`;
}

function verifyAutomatedDecisionRuns(loaded: LoadedResearch): number {
  const policy = loaded.publicationPolicy;
  const proposalPromptVersions = new Set([
    policy.proposal_prompt_version,
    ...policy.historical_proposal_prompt_versions,
  ]);
  const reviewPromptVersions = new Set([
    policy.review_prompt_version,
    ...policy.historical_review_prompt_versions,
  ]);
  const eventById = new Map(loaded.historyFiles.flatMap((history) =>
    history.events.map((event) => [event.id, { category: history.category.id, event }] as const)));
  const publicationByUrl = new Map(loaded.automatedPublicationRuns.flatMap((run) =>
    run.decisions.map((decision) => [decision.candidate_url, decision] as const)));
  const attestedPublicationUrls = new Set<string>();
  let decisions = 0;

  for (const run of loaded.automatedDecisionRuns) {
    if (
      run.model !== policy.model
      || run.reasoning_effort !== policy.reasoning_effort
      || !proposalPromptVersions.has(run.proposal_prompt_version)
      || !reviewPromptVersions.has(run.review_prompt_version)
    ) {
      throw new Error(`${run.id} does not match the versioned automatic publication policy`);
    }
    if (run.decisions.length > 250) {
      throw new Error(`${run.id} exceeds the automatic decision limit`);
    }
    const expectedRunId = automatedDecisionRunId(run);
    if (run.id !== expectedRunId) {
      throw new Error(`Automatic decision run ${run.id} must use ${expectedRunId}`);
    }
    for (const decision of run.decisions) {
      decisions += 1;
      assertCanonicalUrlValue(decision.candidate_url, `${run.id} candidate`);
      if (decision.event_id !== undefined) {
        const bound = eventById.get(decision.event_id);
        if (bound === undefined || bound.category !== decision.category) {
          throw new Error(
            `${run.id} decision for ${decision.candidate_url} references a missing event`,
          );
        }
      }
      if (
        decision.outcome === "published-new-event"
        || decision.outcome === "source-added-to-event"
      ) {
        const publication = publicationByUrl.get(decision.candidate_url);
        if (
          publication === undefined
          || publication.disposition !== decision.outcome
          || publication.category !== decision.category
          || publication.event_id !== decision.event_id
          || publication.proposal_sha256 !== decision.proposal_sha256
          || publication.review_sha256 !== decision.review_sha256
        ) {
          throw new Error(
            `${run.id} decision for ${decision.candidate_url} lacks a matching publication attestation`,
          );
        }
        attestedPublicationUrls.add(decision.candidate_url);
      }
    }
  }
  for (const candidateUrl of publicationByUrl.keys()) {
    if (!attestedPublicationUrls.has(candidateUrl)) {
      throw new Error(`Automatic publication ${candidateUrl} lacks a durable decision record`);
    }
  }
  return decisions;
}

function auditLoadedResearch(loaded: LoadedResearch): ResearchAuditReport {
  const sourceById = verifySources(loaded.sources);
  const mutableSourceStats = verifyMutableSources(loaded, sourceById);
  const referenced = new Set<string>();
  const historyEvents = loaded.historyFiles.flatMap(({ events }) => events);
  const eventIds = historyEvents.map(({ id }) => id);
  if (new Set(eventIds).size !== eventIds.length) {
    throw new Error("History event IDs must be globally unique");
  }
  for (const event of historyEvents) {
    for (const sourceId of event.source_ids) verifyReference(sourceId, sourceById, referenced, event.id);
  }
  for (const valuation of loaded.valuations) {
    for (const sourceId of valuation.source_ids) {
      verifyReference(sourceId, sourceById, referenced, valuation.id);
    }
  }
  const historyEventIds = new Set(historyEvents.map(({ id }) => id));
  for (const observation of loaded.netRevenues) {
    for (const sourceId of observation.source_ids) {
      verifyReference(sourceId, sourceById, referenced, observation.id);
    }
    if (observation.event_id !== undefined && !historyEventIds.has(observation.event_id)) {
      throw new Error(
        `${observation.id} references unknown history event ${observation.event_id}`,
      );
    }
  }
  for (const appearance of loaded.appearances) {
    for (const sourceId of appearance.source_ids) {
      verifyReference(sourceId, sourceById, referenced, appearance.id);
    }
  }
  for (const collection of loaded.collections) {
    verifyCollection(collection, loaded, sourceById);
  }
  verifyResearchRuns(loaded, sourceById);
  const automatedPublicationDecisions = verifyAutomatedPublicationRuns(loaded, sourceById);
  const automatedDecisions = verifyAutomatedDecisionRuns(loaded);
  const matchingCollectionInputs = new Set(
    loaded.collections.flatMap(({ input_source_ids: ids }) => ids),
  );
  const supportingCollectionSources = new Set(
    loaded.collections.flatMap(({ supporting_source_ids: ids }) => ids),
  );
  const allReferenced = new Set([
    ...referenced,
    ...matchingCollectionInputs,
    ...supportingCollectionSources,
  ]);
  return {
    appearances: loaded.appearances.length,
    automatedDecisions,
    automatedDecisionRuns: loaded.automatedDecisionRuns.length,
    automatedPublicationDecisions,
    automatedPublicationRuns: loaded.automatedPublicationRuns.length,
    collectionInputs: matchingCollectionInputs.size,
    collectionSupportingSources: supportingCollectionSources.size,
    collections: loaded.collections.length,
    datasetReferencedSources: referenced.size,
    events: historyEvents.length,
    historyFiles: loaded.historyFiles.length,
    mutableSourceSnapshots: mutableSourceStats.snapshots,
    mutableSourceUrls: mutableSourceStats.urls,
    netRevenues: loaded.netRevenues.length,
    referencedSources: allReferenced.size,
    researchRuns: loaded.researchRuns.length,
    sources: loaded.sources.length,
    unreferencedSources: loaded.sources.length - allReferenced.size,
    valuations: loaded.valuations.length,
  };
}

export async function auditHistoryResearch(
  projectDirectory = process.cwd(),
  options: ResearchAuditOptions = {},
): Promise<ResearchAuditReport> {
  return auditLoadedResearch(await loadResearch(projectDirectory, options));
}

const captureSlug = (collectionId: string, source: ResearchSource): string => {
  const title = source.title
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
    .slice(0, 52)
    .replace(/-$/u, "");
  return `stripe-history-${collectionId}-${source.id.slice(7, 15)}-${title}`;
};

const readBoundedFile = async (path: string, maximumBytes: number): Promise<Buffer> => {
  const value = await readFile(path);
  if (value.byteLength > maximumBytes) {
    throw new Error(`${path.split("/").at(-1) ?? "file"} exceeds ${maximumBytes} bytes`);
  }
  return value;
};

const record = (value: unknown, owner: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${owner} must be an object`);
  }
  return value as Record<string, unknown>;
};

const boundedString = (
  value: unknown,
  owner: string,
  maximumLength = 2_048,
): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    throw new Error(`${owner} must be a non-empty string of at most ${maximumLength} characters`);
  }
  return value;
};

const optionalBoundedString = (value: unknown, owner: string): string | undefined =>
  value === undefined || value === null ? undefined : boundedString(value, owner);

const captureUrl = (value: unknown, owner: string): string | undefined => {
  const text = optionalBoundedString(value, owner);
  if (text === undefined) return undefined;
  const url = new URL(text);
  if (url.protocol !== "https:") throw new Error(`${owner} must use HTTPS`);
  return text;
};

function parseCaptureProjection(value: unknown, bundleName: string): CaptureProjection | undefined {
  const manifest = record(value, `${bundleName}/capture.json`);
  const schemaVersion = manifest.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3) {
    throw new Error(`${bundleName}/capture.json has unsupported schemaVersion`);
  }
  const statusValue = boundedString(manifest.status, `${bundleName} status`, 16);
  if (statusValue !== "blocked" && statusValue !== "complete" && statusValue !== "partial") {
    throw new Error(`${bundleName}/capture.json has unsupported status ${statusValue}`);
  }
  const capturedAt = boundedString(manifest.capturedAt, `${bundleName} capturedAt`, 64);
  if (!ISO_INSTANT.test(capturedAt) || Number.isNaN(Date.parse(capturedAt))) {
    throw new Error(`${bundleName}/capture.json has invalid capturedAt`);
  }

  const urls: (string | undefined)[] = [];
  let evidencePath: string | undefined;
  let evidenceMetadataComplete = true;
  if (schemaVersion === 1 && manifest.kind === "pdf") {
    const source = record(manifest.source, `${bundleName} source`);
    urls.push(
      captureUrl(source.requestedUrl, `${bundleName} requestedUrl`),
      captureUrl(source.finalUrl, `${bundleName} finalUrl`),
    );
    evidencePath = optionalBoundedString(source.path, `${bundleName} source path`);
    evidenceMetadataComplete = evidencePath !== undefined;
  } else {
    urls.push(
      captureUrl(manifest.sourceUrl, `${bundleName} sourceUrl`),
      captureUrl(manifest.canonicalUrl, `${bundleName} canonicalUrl`),
    );
    if (manifest.acquisition !== undefined) {
      const acquisition = record(manifest.acquisition, `${bundleName} acquisition`);
      urls.push(captureUrl(acquisition.finalUrl, `${bundleName} acquisition finalUrl`));
    }
    if (manifest.evidence !== undefined) {
      const evidence = record(manifest.evidence, `${bundleName} evidence`);
      const requested = optionalBoundedString(
        evidence.requested,
        `${bundleName} evidence requested`,
      );
      const sourceHtmlStatus = optionalBoundedString(
        evidence.sourceHtmlStatus,
        `${bundleName} sourceHtmlStatus`,
      );
      evidencePath = optionalBoundedString(
        evidence.sourceHtmlPath,
        `${bundleName} sourceHtmlPath`,
      );
      evidenceMetadataComplete = requested === "source"
        && sourceHtmlStatus === "captured"
        && evidencePath !== undefined;
    } else {
      evidenceMetadataComplete = false;
    }
  }
  const presentUrls = [...new Set(urls.filter((url): url is string => url !== undefined))];
  if (presentUrls.length === 0 && schemaVersion === 1 && manifest.kind === "pdf") return undefined;
  if (presentUrls.length === 0 || presentUrls.length > 3) {
    throw new Error(`${bundleName}/capture.json must project one to three source URLs`);
  }
  if (evidencePath !== undefined) {
    const normalizedPath = normalize(evidencePath);
    if (isAbsolute(evidencePath) || normalizedPath.startsWith("..") || normalizedPath === ".") {
      throw new Error(`${bundleName}/capture.json has unsafe evidence path`);
    }
    evidencePath = normalizedPath;
  }
  return {
    capturedOn: capturedAt.slice(0, 10),
    ...(evidencePath === undefined ? {} : { evidencePath }),
    status: statusValue === "complete" && !evidenceMetadataComplete ? "partial" : statusValue,
    urls: presentUrls,
  };
}

type DeclaredCaptureEvidence = LoadedResearch["mutableSources"][number]["capture_evidence"];

async function verifyCaptureEvidenceBundle(
  captureRoot: string,
  expectedUrl: string,
  evidence: DeclaredCaptureEvidence,
  owner: string,
): Promise<void> {
  const bundleDirectory = join(captureRoot, evidence.capture_slug);
  const manifestBytes = await readBoundedFile(
    join(bundleDirectory, "capture.json"),
    MAX_CAPTURE_MANIFEST_BYTES,
  );
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(manifestBytes.toString("utf8")) as unknown;
  } catch {
    throw new Error(`${owner} capture ${evidence.capture_slug} has invalid JSON`);
  }
  const projection = parseCaptureProjection(manifestValue, evidence.capture_slug);
  if (projection === undefined) {
    throw new Error(`${owner} capture ${evidence.capture_slug} has no source projection`);
  }
  if (!projection.urls.some((url) => canonicalCaptureUrl(url) === canonicalCaptureUrl(expectedUrl))) {
    throw new Error(`${owner} capture ${evidence.capture_slug} does not prove ${expectedUrl}`);
  }
  if (projection.capturedOn !== evidence.captured_on) {
    throw new Error(`${owner} capture date does not match ${evidence.capture_slug}`);
  }
  if (projection.status !== evidence.status) {
    throw new Error(`${owner} capture status does not match ${evidence.capture_slug}`);
  }
  if (evidence.status === "blocked") return;
  if (projection.evidencePath !== evidence.evidence_path) {
    throw new Error(`${owner} evidence path does not match ${evidence.capture_slug}`);
  }
  const evidenceAbsolute = resolve(bundleDirectory, evidence.evidence_path);
  if (relative(bundleDirectory, evidenceAbsolute).startsWith("..")) {
    throw new Error(`${owner} evidence escapes ${evidence.capture_slug}`);
  }
  const evidenceBytes = await readBoundedFile(evidenceAbsolute, MAX_EVIDENCE_BYTES);
  if (evidenceBytes.byteLength === 0) {
    throw new Error(`${owner} evidence is empty in ${evidence.capture_slug}`);
  }
  if (sha256(evidenceBytes) !== evidence.sha256) {
    throw new Error(`${owner} evidence digest does not match ${evidence.capture_slug}`);
  }
}

async function verifyDeclaredCaptureEvidence(
  captureRoot: string,
  loaded: LoadedResearch,
): Promise<void> {
  for (const mutableSource of loaded.mutableSources) {
    await verifyCaptureEvidenceBundle(
      captureRoot,
      mutableSource.canonical_url,
      mutableSource.capture_evidence,
      `Mutable source ${mutableSource.canonical_url}`,
    );
  }
  for (const run of loaded.researchRuns) {
    if (run.kind === "baseline-import") continue;
    for (const decision of run.decisions) {
      if (decision.evidence !== undefined) {
        await verifyCaptureEvidenceBundle(
          captureRoot,
          decision.candidate_url,
          decision.evidence,
          `${run.collection} decision ${decision.candidate_id}`,
        );
      }
    }
  }
}

async function loadCaptureIndex(captureRoot: string): Promise<Map<string, IndexedCapture[]>> {
  let entries;
  try {
    entries = await readdir(captureRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }
  const bundleNames = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name).toSorted();
  if (bundleNames.length > MAX_CAPTURE_BUNDLES) {
    throw new Error(`Capture root contains more than ${MAX_CAPTURE_BUNDLES} immediate bundles`);
  }
  const byUrl = new Map<string, IndexedCapture[]>();
  for (const bundleName of bundleNames) {
    const bundleDirectory = join(captureRoot, bundleName);
    let manifestBytes;
    try {
      manifestBytes = await readBoundedFile(
        join(bundleDirectory, "capture.json"),
        MAX_CAPTURE_MANIFEST_BYTES,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    let manifestValue: unknown;
    try {
      manifestValue = JSON.parse(manifestBytes.toString("utf8")) as unknown;
    } catch {
      throw new Error(`${bundleName}/capture.json is not valid JSON`);
    }
    const projection = parseCaptureProjection(manifestValue, bundleName);
    if (projection === undefined) continue;
    let evidenceSha256: string | undefined;
    let evidenceBytesPresent = false;
    if (projection.evidencePath !== undefined) {
      const evidenceAbsolute = resolve(bundleDirectory, projection.evidencePath);
      if (relative(bundleDirectory, evidenceAbsolute).startsWith("..")) {
        throw new Error(`${bundleName}/capture.json evidence escapes its bundle`);
      }
      try {
        const evidence = await readBoundedFile(evidenceAbsolute, MAX_EVIDENCE_BYTES);
        if (evidence.byteLength > 0) {
          evidenceBytesPresent = true;
          evidenceSha256 = createHash("sha256").update(evidence).digest("hex");
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const indexed: IndexedCapture = {
      ...projection,
      bundleName,
      ...(projection.status === "complete" && !evidenceBytesPresent ? { status: "partial" } : {}),
      ...(evidenceSha256 === undefined ? {} : { evidenceSha256 }),
    };
    for (const url of projection.urls) {
      const canonicalUrl = canonicalCaptureUrl(url);
      const captures = byUrl.get(canonicalUrl) ?? [];
      captures.push(indexed);
      byUrl.set(canonicalUrl, captures);
    }
  }
  return byUrl;
}

async function verifyAllAcceptedCapturePolicies(
  captureRoot: string,
  loaded: LoadedResearch,
): Promise<void> {
  const collections = loaded.collections.filter(
    ({ capture_policy: policy }) => policy === "all-accepted",
  );
  if (collections.length === 0) return;
  const sourceById = new Map(loaded.sources.map((source) => [source.id, source]));
  const captureIndex = await loadCaptureIndex(captureRoot);
  for (const collection of collections) {
    for (const sourceId of collection.input_source_ids) {
      const source = sourceById.get(sourceId);
      if (source === undefined) {
        throw new Error(`${collection.id} capture policy references missing ${sourceId}`);
      }
      const capture = bestCapture(
        captureIndex.get(canonicalCaptureUrl(source.url)) ?? [],
      );
      if (capture?.status !== "complete" || capture.evidenceSha256 === undefined) {
        throw new Error(
          `${collection.id} all-accepted capture policy requires complete evidence for ${sourceId}`,
        );
      }
    }
  }
}

function canonicalCaptureUrl(urlValue: string): string {
  const url = new URL(canonicalResearchSourceUrl(urlValue));
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

const cadenceDays = (cadence: ResearchCollection["refresh"]["cadence"]): number => ({
  annual: 365,
  monthly: 31,
  quarterly: 92,
})[cadence];

function assertExactIsoDate(value: string, owner: string): string {
  if (value.length !== 10 || !PartialDateSchema.safeParse(value).success) {
    throw new Error(`${owner} must be an exact ISO date`);
  }
  return value;
}

function exactIsoDateValue(value: string, owner: string): Date {
  const date = assertExactIsoDate(value, owner);
  const [year, month, day] = date.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`${owner} must be an exact ISO date`);
  }
  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(year, month - 1, day);
  return result;
}

function daysBetween(from: string, through: string): number {
  const milliseconds = exactIsoDateValue(through, "Research capture through date").getTime()
    - exactIsoDateValue(from, "Research capture start date").getTime();
  return Math.floor(milliseconds / 86_400_000);
}

function shiftIsoDate(date: string, days: number): string {
  const value = exactIsoDateValue(date, "Research discovery watermark");
  value.setUTCDate(value.getUTCDate() + days);
  return assertExactIsoDate(
    value.toISOString().slice(0, 10),
    "Shifted research discovery watermark",
  );
}

function partialDateFloor(date: string): string {
  return date.length === 4 ? `${date}-01-01` : date.length === 7 ? `${date}-01` : date;
}

function stableDiscoveryTaskId(
  collection: string,
  kind: "discovery-source" | "query-family",
  value: string,
  from: string,
  through: string,
): string {
  return `task-${sha256(JSON.stringify([collection, kind, value, from, through])).slice(0, 20)}`;
}

export function buildDiscoveryPlan(
  collection: ResearchCollection,
  acceptedSourceIds: readonly string[],
  reviewedThrough: string,
  targetThrough: string,
): ResearchDiscoveryPlan {
  const lookbackFrom = [
    partialDateFloor(collection.coverage.from),
    shiftIsoDate(reviewedThrough, -collection.refresh.lookback_days),
  ].toSorted().at(-1);
  if (lookbackFrom === undefined) throw new Error(`Missing ${collection.id} lookback`);
  const taskInputs: readonly Readonly<{
    kind: "discovery-source" | "query-family";
    value: string;
  }>[] = [
    ...collection.discovery_sources.map((value) => ({
      kind: "discovery-source" as const,
      value,
    })),
    ...collection.query_families.map((value) => ({
      kind: "query-family" as const,
      value,
    })),
  ].toSorted((left, right) =>
    left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value)
  );
  const tasks: ResearchDiscoveryPlan["tasks"] = taskInputs.map(
    ({ kind, value }) => kind === "discovery-source"
      ? {
          id: stableDiscoveryTaskId(collection.id, kind, value, lookbackFrom, targetThrough),
          kind,
          url: value,
        }
      : {
          id: stableDiscoveryTaskId(collection.id, kind, value, lookbackFrom, targetThrough),
          kind,
          query: value,
        },
  );
  const planWithoutDigest = {
    acceptedInputSha256: sha256(canonicalJson(acceptedSourceIds)),
    acceptedSourceIds,
    authorityOrder: collection.authority_order,
    collection: collection.id,
    dataset: collection.dataset,
    dedupeKeys: collection.dedupe_keys,
    minimumRequestIntervalMs: collection.refresh.minimum_request_interval_ms,
    outputFiles: collection.output_files,
    reviewRequirements: [
      "canonical-and-native-identity",
      "semantic-claim-deduplication",
      "source-capture-before-acceptance",
      "human-significance-review",
      "advance-watermark-after-complete-review",
    ] as const,
    schema: "stripe-history/research-discovery-plan/v1" as const,
    tasks,
    watermark: {
      lookbackFrom,
      reviewedThrough,
      targetThrough,
    },
  };
  return {
    ...planWithoutDigest,
    planSha256: sha256(canonicalJson(planWithoutDigest)),
  };
}

export async function planHistoryResearchDiscovery(
  projectDirectory = process.cwd(),
  collectionId: string | undefined,
  asOf: string,
): Promise<readonly ResearchDiscoveryPlan[]> {
  assertExactIsoDate(asOf, "Research discovery --as-of");
  const loaded = await loadResearch(projectDirectory);
  auditLoadedResearch(loaded);
  const collections = collectionId === undefined
    ? loaded.collections
    : loaded.collections.filter(({ id }) => id === collectionId);
  if (collectionId !== undefined && collections.length === 0) {
    throw new Error(`Unknown research collection ${collectionId}`);
  }
  return collections
    .filter(({ refresh }) => refresh.mode === "incremental-discovery")
    .filter(({ coverage }) => coverage.through < asOf)
    .map((collection) => buildDiscoveryPlan(
      collection,
      collection.input_source_ids,
      collection.coverage.through,
      asOf,
    ))
    .toSorted((left, right) => left.collection.localeCompare(right.collection));
}

function isStaleCapture(
  collection: ResearchCollection,
  source: ResearchSource,
  capture: IndexedCapture,
  asOf: string,
  mutableUrls: ReadonlySet<string>,
): boolean {
  const refreshesAcceptedInputs = collection.refresh.mode === "fixed-source-refetch"
    || mutableUrls.has(canonicalCaptureUrl(source.url));
  return refreshesAcceptedInputs
    && daysBetween(capture.capturedOn, asOf)
      > cadenceDays(collection.refresh.cadence) + collection.refresh.lookback_days;
}

function bestCapture(captures: readonly IndexedCapture[]): IndexedCapture | undefined {
  return captures.toSorted((left, right) => {
    const statusRank = { blocked: 0, partial: 1, complete: 2 } as const;
    return statusRank[right.status] - statusRank[left.status]
      || right.capturedOn.localeCompare(left.capturedOn)
      || (right.evidenceSha256 ?? "").localeCompare(left.evidenceSha256 ?? "");
  })[0];
}

export async function planHistoryResearchCaptures(
  projectDirectory = process.cwd(),
  collectionId?: string,
  options: ResearchCapturePlanOptions = {},
): Promise<readonly ResearchCapturePlanItem[]> {
  const explicitAsOf = options.asOf === undefined
    ? undefined
    : assertExactIsoDate(options.asOf, "Capture planning --as-of");
  const loaded = await loadResearch(projectDirectory);
  auditLoadedResearch(loaded);
  const sourceById = new Map(loaded.sources.map((source) => [source.id, source]));
  const mutableUrls = new Set(
    loaded.mutableSources.map(({ canonical_url: url }) => canonicalCaptureUrl(url)),
  );
  const collections = collectionId === undefined
    ? loaded.collections
    : loaded.collections.filter(({ id }) => id === collectionId);
  if (collectionId !== undefined && collections.length === 0) {
    throw new Error(`Unknown research collection ${collectionId}`);
  }
  const captureRoot = options.captureRoot
    ?? resolve(projectDirectory, "research-evidence");
  const captureIndex = await loadCaptureIndex(captureRoot);
  const plan = collections.flatMap((collection) => collection.input_source_ids.map((sourceId) => {
    const source = sourceById.get(sourceId);
    if (source === undefined) throw new Error(`Missing source ${sourceId}`);
    const asOf = explicitAsOf
      ?? assertExactIsoDate(collection.coverage.through, `${collection.id} coverage through`);
    const capture = bestCapture(captureIndex.get(canonicalCaptureUrl(source.url)) ?? []);
    const stale = capture !== undefined
      && capture.status === "complete"
      && isStaleCapture(collection, source, capture, asOf, mutableUrls);
    const captureStatus: ResearchCapturePlanItem["captureStatus"] = capture?.status ?? "missing";
    const reason = capture === undefined
      ? "capture-missing" as const
      : stale
        ? "capture-stale" as const
        : capture.status === "complete"
          ? "capture-complete" as const
          : capture.status === "partial"
            ? "capture-partial" as const
            : "capture-blocked" as const;
    return {
      captureStatus,
      collection: collection.id,
      evidence: "source" as const,
      ...(capture?.evidenceSha256 === undefined
        ? {}
        : { evidenceSha256: capture.evidenceSha256 }),
      media: ["podcast", "video"].includes(source.media_type) ? "images" as const : "none" as const,
      reason,
      slug: capture?.bundleName ?? captureSlug(collection.id, source),
      sourceId,
      url: source.url,
    };
  })).filter(({ reason }) => options.all === true || reason !== "capture-complete");
  return plan.toSorted((left, right) =>
    left.collection.localeCompare(right.collection) || left.sourceId.localeCompare(right.sourceId)
  );
}

if (import.meta.main) {
  const collectionFlag = process.argv.indexOf("--collection");
  const collectionId = collectionFlag === -1 ? undefined : process.argv[collectionFlag + 1];
  if (collectionFlag !== -1 && collectionId === undefined) {
    throw new Error("--collection requires an ID");
  }
  const captureRootFlag = process.argv.indexOf("--capture-root");
  const captureRoot = captureRootFlag === -1 ? undefined : process.argv[captureRootFlag + 1];
  if (captureRootFlag !== -1 && captureRoot === undefined) {
    throw new Error("--capture-root requires a directory");
  }
  const asOfFlag = process.argv.indexOf("--as-of");
  const asOf = asOfFlag === -1 ? undefined : process.argv[asOfFlag + 1];
  if (asOfFlag !== -1 && asOf === undefined) throw new Error("--as-of requires an ISO date");
  const capturePlan = process.argv.includes("--plan");
  const discoveryPlan = process.argv.includes("--discover");
  if (capturePlan && discoveryPlan) {
    throw new Error("Choose either --plan or --discover");
  }
  if (discoveryPlan) {
    if (asOf === undefined) {
      throw new Error("Research discovery requires an explicit --as-of ISO date");
    }
    console.log(JSON.stringify(
      await planHistoryResearchDiscovery(process.cwd(), collectionId, asOf),
      null,
      2,
    ));
  } else if (capturePlan) {
    console.log(JSON.stringify(await planHistoryResearchCaptures(process.cwd(), collectionId, {
      all: process.argv.includes("--all"),
      ...(asOf === undefined ? {} : { asOf }),
      ...(captureRoot === undefined ? {} : { captureRoot }),
    }), null, 2));
  } else {
    console.log(JSON.stringify(await auditHistoryResearch(process.cwd(), {
      ...(captureRoot === undefined ? {} : { captureRoot }),
    }), null, 2));
  }
}
