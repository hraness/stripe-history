import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import {
  HistoryFileSchema,
  historyCategoryIds,
  type HistoryEvent,
  type HistoryFile,
  type HistorySource,
  type TimelineCategoryId,
} from "./history-schema";
import {
  AppearanceFileSchema,
  isCompanyFiscalRevenueObservation,
  NetRevenueFileSchema,
  ResearchSourceCatalogSchema,
  ValuationFileSchema,
  type Appearance,
  type NetRevenueObservation,
  type ResearchSource,
  type ValuationObservation,
} from "./research-schema";

const PROJECT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIRECTORY = join(PROJECT_DIRECTORY, "public");
const HISTORY_DIRECTORY = join(PUBLIC_DIRECTORY, "history");
const RESEARCH_DIRECTORY = join(PUBLIC_DIRECTORY, "research");

async function parseYamlFile(path: string): Promise<unknown> {
  return parse(await readFile(path, "utf8")) as unknown;
}

export interface CategorizedHistoryEvent extends Omit<HistoryEvent, "source_ids"> {
  readonly categoryId: TimelineCategoryId;
  readonly categoryLabel: string;
  readonly categoryOrder: number;
  readonly sourceIds: readonly string[];
  readonly sources: readonly HistorySource[];
}

export interface TimelineCategory {
  readonly description: string;
  readonly id: TimelineCategoryId;
  readonly label: string;
  readonly order: number;
}

export interface AnnualVolumePoint {
  readonly calendarYear: number;
  readonly categoryId: HistoryFile["category"]["id"];
  readonly display: string;
  readonly eventId: string;
  readonly kind: "payment-volume" | "total-volume";
  readonly qualifier: "lower-bound" | "published-value";
  readonly valueUsd: number;
}

export interface ResolvedValuationObservation extends ValuationObservation {
  readonly sources: readonly ResearchSource[];
}

export interface ResolvedNetRevenueObservation extends NetRevenueObservation {
  readonly sources: readonly ResearchSource[];
}

export interface NetRevenueHeadlinePoint {
  readonly calendarYear: number;
  readonly display: string;
  readonly observationId: string;
  readonly status: NetRevenueObservation["status"];
  readonly valueUsd: number;
}

export interface ValuationHeadlinePoint {
  readonly calendarYear: number;
  readonly display: string;
  readonly observationId: string;
  readonly tier: "financing-tender" | "internal-mark" | "market-signal" | "secondary";
  readonly valueUsd: number;
}

export interface HistoryCollection {
  readonly annualVolumes: readonly AnnualVolumePoint[];
  readonly appearances: readonly Appearance[];
  readonly categories: readonly TimelineCategory[];
  readonly events: readonly CategorizedHistoryEvent[];
  readonly files: readonly HistoryFile[];
  readonly netRevenueHeadlines: readonly NetRevenueHeadlinePoint[];
  readonly netRevenues: readonly ResolvedNetRevenueObservation[];
  readonly sources: readonly ResearchSource[];
  readonly valuationHeadlines: readonly ValuationHeadlinePoint[];
  readonly valuations: readonly ResolvedValuationObservation[];
}

export const APPEARANCES_CATEGORY = {
  description:
    "Reviewed podcasts, interviews, talks, and testimony from Stripe founders and senior leaders, with source-linked editorial summaries and transcripts when available.",
  id: "appearances",
  label: "Appearances",
  order: 2.5,
} as const satisfies TimelineCategory;

function formatAppearanceDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours === 0 ? `${minutes} min` : `${hours} hr ${minutes} min`;
}

function appearanceFormat(appearance: Appearance): string {
  if (appearance.media.includes("testimony")) return "testimony";
  if (appearance.media.includes("podcast")) return "podcast";
  if (appearance.media.includes("video")) return "video";
  if (appearance.media.includes("article")) return "article";
  return "interview";
}

function appearanceDetails(
  appearance: Appearance,
): NonNullable<HistoryEvent["details"]> {
  const participants = appearance.participants.map((participant) =>
    participant.stripe_role === undefined
      ? participant.name
      : `${participant.name} · ${participant.stripe_role}`
  ).join("; ");
  const venue = appearance.series === undefined
    ? appearance.venue
    : `${appearance.series} · ${appearance.venue}`;
  const recording = [
    appearance.duration_seconds === undefined
      ? undefined
      : formatAppearanceDuration(appearance.duration_seconds),
    appearance.transcript.availability === "none"
      ? undefined
      : `${appearance.transcript.availability} transcript`,
  ].filter((value): value is string => value !== undefined).join(" · ");

  return [
    {
      label: appearance.participants.length === 1 ? "participant" : "participants",
      value: participants,
    },
    { label: "venue", value: venue },
    ...(recording === "" ? [] : [{ label: "recording", value: recording }]),
  ];
}

export function validateAnnualVolumeSeries(
  points: readonly AnnualVolumePoint[],
): void {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) continue;
    if (previous.calendarYear >= current.calendarYear) {
      throw new Error("History annual volume years must be strictly increasing");
    }
  }
}

export function valuationTier(
  observation: ValuationObservation,
): ValuationHeadlinePoint["tier"] {
  const transactionReachedARecordedMilestone = [
    "agreements-signed",
    "company-confirmed",
    "completed",
  ].includes(observation.status);
  if (
    transactionReachedARecordedMilestone
    && (
      observation.mechanism === "company-tender"
      || observation.mechanism === "primary-financing"
      || observation.mechanism === "seed-financing"
    )
  ) return "financing-tender";
  if (observation.mechanism === "internal-409a") return "internal-mark";
  if (
    observation.mechanism === "investor-secondary"
    && transactionReachedARecordedMilestone
  ) return "secondary";
  return "market-signal";
}

const valuationTierRank: Readonly<Record<ValuationHeadlinePoint["tier"], number>> = {
  "financing-tender": 4,
  "internal-mark": 3,
  secondary: 2,
  "market-signal": 1,
};

const valuationStatusRank: Readonly<Record<ValuationObservation["status"], number>> = {
  "company-confirmed": 5,
  completed: 4,
  "agreements-signed": 3,
  reported: 2,
  retrospective: 1,
};

const valuationConfidenceRank: Readonly<Record<ValuationObservation["confidence"], number>> = {
  confirmed: 3,
  reported: 2,
  indicative: 1,
};

const sourceAuthorityRank: Readonly<Record<ResearchSource["kind"], number>> = {
  primary: 5,
  filing: 4,
  interview: 3,
  reporting: 2,
  archive: 1,
};

type HeadlineCandidate = ValuationObservation & {
  readonly sources?: readonly ResearchSource[];
};

function strongestSourceAuthority(
  observation: Readonly<{ sources?: readonly ResearchSource[] }>,
): number {
  return Math.max(
    0,
    ...(observation.sources ?? []).map(({ kind }) => sourceAuthorityRank[kind]),
  );
}

function compareValuationHeadlineCandidates(
  left: HeadlineCandidate,
  right: HeadlineCandidate,
): number {
  return valuationTierRank[valuationTier(right)] - valuationTierRank[valuationTier(left)]
    || valuationStatusRank[right.status] - valuationStatusRank[left.status]
    || valuationConfidenceRank[right.confidence] - valuationConfidenceRank[left.confidence]
    || strongestSourceAuthority(right) - strongestSourceAuthority(left)
    || Number(left.valuation.precision === "inferred")
      - Number(right.valuation.precision === "inferred")
    || right.effective_date.localeCompare(left.effective_date)
    || (right.reported_at ?? "").localeCompare(left.reported_at ?? "")
    || left.id.localeCompare(right.id);
}

const netRevenueStatusRank: Readonly<Record<NetRevenueObservation["status"], number>> = {
  "company-confirmed": 2,
  reported: 1,
};

const netRevenueConfidenceRank: Readonly<Record<NetRevenueObservation["confidence"], number>> = {
  confirmed: 2,
  reported: 1,
};

type NetRevenueHeadlineCandidate = NetRevenueObservation & {
  readonly sources?: readonly ResearchSource[];
};

function compareNetRevenueHeadlineCandidates(
  left: NetRevenueHeadlineCandidate,
  right: NetRevenueHeadlineCandidate,
): number {
  return netRevenueStatusRank[right.status] - netRevenueStatusRank[left.status]
    || netRevenueConfidenceRank[right.confidence] - netRevenueConfidenceRank[left.confidence]
    || strongestSourceAuthority(right) - strongestSourceAuthority(left)
    || right.period_end.localeCompare(left.period_end)
    || (right.reported_at ?? "").localeCompare(left.reported_at ?? "")
    || left.id.localeCompare(right.id);
}

export function deriveNetRevenueHeadlines(
  observations: readonly NetRevenueHeadlineCandidate[],
): readonly NetRevenueHeadlinePoint[] {
  const byYear = new Map<number, NetRevenueHeadlineCandidate[]>();
  for (const observation of observations) {
    if (!isCompanyFiscalRevenueObservation(observation)) continue;
    const existing = byYear.get(observation.calendar_year) ?? [];
    existing.push(observation);
    byYear.set(observation.calendar_year, existing);
  }
  return [...byYear].map(([calendarYear, candidates]) => {
    const selected = candidates.toSorted(compareNetRevenueHeadlineCandidates)[0];
    if (selected === undefined) throw new Error(`Missing net revenue for ${calendarYear}`);
    return {
      calendarYear,
      display: selected.amount.display,
      observationId: selected.id,
      status: selected.status,
      valueUsd: selected.amount.value_usd,
    };
  }).toSorted((left, right) => left.calendarYear - right.calendarYear);
}

export function deriveValuationHeadlines(
  observations: readonly HeadlineCandidate[],
): readonly ValuationHeadlinePoint[] {
  const byYear = new Map<number, HeadlineCandidate[]>();
  for (const observation of observations) {
    const year = Number(observation.effective_date.slice(0, 4));
    const existing = byYear.get(year) ?? [];
    existing.push(observation);
    byYear.set(year, existing);
  }
  return [...byYear].map(([calendarYear, candidates]) => {
    const selected = candidates.toSorted(compareValuationHeadlineCandidates)[0];
    if (selected === undefined) throw new Error(`Missing valuation for ${calendarYear}`);
    return {
      calendarYear,
      display: selected.valuation.display,
      observationId: selected.id,
      tier: valuationTier(selected),
      valueUsd: selected.valuation.value_usd,
    };
  }).toSorted((left, right) => left.calendarYear - right.calendarYear);
}

function resolveSources(
  sourceIds: readonly string[],
  sourceById: ReadonlyMap<string, ResearchSource>,
  owner: string,
): readonly ResearchSource[] {
  return sourceIds.map((sourceId) => {
    const source = sourceById.get(sourceId);
    if (source === undefined) throw new Error(`${owner} references unknown source ${sourceId}`);
    return source;
  });
}

export async function loadHistory(
  directory = HISTORY_DIRECTORY,
  researchDirectory = RESEARCH_DIRECTORY,
): Promise<HistoryCollection> {
  const [sourceCatalog, valuationFile, netRevenueFile, appearanceFile] = await Promise.all([
    parseYamlFile(join(researchDirectory, "sources.yml")).then((value) =>
      ResearchSourceCatalogSchema.parse(value)
    ),
    parseYamlFile(join(researchDirectory, "valuations.yml")).then((value) =>
      ValuationFileSchema.parse(value)
    ),
    parseYamlFile(join(researchDirectory, "net-revenue.yml")).then((value) =>
      NetRevenueFileSchema.parse(value)
    ),
    parseYamlFile(join(researchDirectory, "appearances.yml")).then((value) =>
      AppearanceFileSchema.parse(value)
    ),
  ]);
  const sourceById = new Map(sourceCatalog.sources.map((source) => [source.id, source]));
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".yml"))
    .toSorted();
  const parsedFiles = await Promise.all(
    fileNames.map(async (fileName) => ({
      file: HistoryFileSchema.parse(await parseYamlFile(join(directory, fileName))),
      fileName,
    })),
  );
  for (const { file, fileName } of parsedFiles) {
    if (fileName !== `${file.category.id}.yml`) {
      throw new Error(
        `History file ${fileName} must match category ${file.category.id}.yml`,
      );
    }
  }
  const files = parsedFiles.map(({ file }) => file);

  const categoryIds = files.map((file) => file.category.id);
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new Error("History category IDs must be unique");
  }
  const missingCategories = historyCategoryIds.filter(
    (categoryId) => !categoryIds.includes(categoryId),
  );
  if (missingCategories.length > 0) {
    throw new Error(`History is missing categories: ${missingCategories.join(", ")}`);
  }
  const categoryOrders = files.map((file) => file.category.order);
  if (new Set(categoryOrders).size !== categoryOrders.length) {
    throw new Error("History category orders must be unique");
  }

  const historyEvents = files.flatMap((file) =>
    file.events.map((event) => {
      const { source_ids: sourceIds, ...eventFields } = event;
      return {
        ...eventFields,
        categoryId: file.category.id,
        categoryLabel: file.category.label,
        categoryOrder: file.category.order,
        sourceIds,
        sources: resolveSources(sourceIds, sourceById, `History event ${event.id}`),
      };
    })
  );
  const eventIds = historyEvents.map((event) => event.id);
  if (new Set(eventIds).size !== eventIds.length) {
    throw new Error("History event IDs must be globally unique");
  }
  const knownEventIds = new Set(eventIds);
  const eventById = new Map(historyEvents.map((event) => [event.id, event]));
  for (const event of historyEvents) {
    const unknownRelatedEvents = event.related_events?.filter(
      (eventId) => !knownEventIds.has(eventId),
    ) ?? [];
    if (unknownRelatedEvents.length > 0) {
      throw new Error(
        `History event ${event.id} references unknown events: ${unknownRelatedEvents.join(", ")}`,
      );
    }
    const asymmetricRelatedEvents = event.related_events?.filter((eventId) =>
      eventById.get(eventId)?.related_events?.includes(event.id) !== true
    ) ?? [];
    if (asymmetricRelatedEvents.length > 0) {
      throw new Error(
        `History event ${event.id} has non-reciprocal related events: ${asymmetricRelatedEvents.join(", ")}`,
      );
    }
    if (
      event.annual_volume !== undefined
      && !event.sources.some(({ kind }) => kind === "primary")
    ) {
      throw new Error(`History annual volume ${event.id} requires a primary source`);
    }
  }
  const annualVolumes = historyEvents.flatMap((event) =>
    event.annual_volume === undefined
      ? []
      : [{
          calendarYear: event.annual_volume.calendar_year,
          categoryId: event.categoryId,
          display: event.annual_volume.display,
          eventId: event.id,
          kind: event.annual_volume.kind,
          qualifier: event.annual_volume.qualifier,
          valueUsd: event.annual_volume.value_usd,
        }]
  ).toSorted((left, right) => left.calendarYear - right.calendarYear);
  validateAnnualVolumeSeries(annualVolumes);

  const valuations = valuationFile.observations.map((observation) => ({
    ...observation,
    sources: resolveSources(
      observation.source_ids,
      sourceById,
      `Valuation ${observation.id}`,
    ),
  }));
  for (const valuation of valuations) {
    if (valuation.event_id !== undefined && !knownEventIds.has(valuation.event_id)) {
      throw new Error(
        `Valuation ${valuation.id} references unknown history event ${valuation.event_id}`,
      );
    }
  }
  const netRevenues = netRevenueFile.observations.map((observation) => ({
    ...observation,
    sources: resolveSources(
      observation.source_ids,
      sourceById,
      `Net revenue ${observation.id}`,
    ),
  }));
  for (const observation of netRevenues) {
    if (observation.event_id !== undefined && !knownEventIds.has(observation.event_id)) {
      throw new Error(
        `Net revenue ${observation.id} references unknown history event ${observation.event_id}`,
      );
    }
  }
  const appearanceEvents: readonly CategorizedHistoryEvent[] =
    appearanceFile.appearances.map((appearance) => ({
      categoryId: APPEARANCES_CATEGORY.id,
      categoryLabel: APPEARANCES_CATEGORY.label,
      categoryOrder: APPEARANCES_CATEGORY.order,
      confidence: "confirmed",
      date: appearance.occurred_at,
      date_precision: appearance.date_precision,
      details: appearanceDetails(appearance),
      id: appearance.id,
      people: appearance.participants.map(({ name }) => name),
      sourceIds: appearance.source_ids,
      sources: resolveSources(
        appearance.source_ids,
        sourceById,
        `Appearance ${appearance.id}`,
      ),
      status: appearanceFormat(appearance),
      summary: appearance.digest?.gist ?? appearance.significance,
      tags: appearance.topics,
      title: appearance.title,
    }));
  const combinedEventIds = [
    ...eventIds,
    ...appearanceEvents.map(({ id }) => id),
  ];
  if (new Set(combinedEventIds).size !== combinedEventIds.length) {
    throw new Error("Timeline event IDs must be globally unique");
  }
  const categories = [
    ...files.map((file) => file.category),
    APPEARANCES_CATEGORY,
  ].toSorted((left, right) => left.order - right.order);
  const events = [...historyEvents, ...appearanceEvents].toSorted((left, right) =>
    right.date.localeCompare(left.date)
    || left.categoryOrder - right.categoryOrder
    || left.id.localeCompare(right.id)
  );

  return {
    annualVolumes,
    appearances: appearanceFile.appearances,
    categories,
    events,
    files,
    netRevenueHeadlines: deriveNetRevenueHeadlines(netRevenues),
    netRevenues,
    sources: sourceCatalog.sources,
    valuationHeadlines: deriveValuationHeadlines(valuations),
    valuations,
  };
}
