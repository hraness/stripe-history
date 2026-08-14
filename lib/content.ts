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
} from "./history-schema";
import {
  AppearanceFileSchema,
  ResearchSourceCatalogSchema,
  ValuationFileSchema,
  type Appearance,
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
  readonly categoryId: HistoryFile["category"]["id"];
  readonly categoryLabel: string;
  readonly categoryOrder: number;
  readonly sourceIds: readonly string[];
  readonly sources: readonly HistorySource[];
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
  readonly categories: readonly HistoryFile["category"][];
  readonly events: readonly CategorizedHistoryEvent[];
  readonly files: readonly HistoryFile[];
  readonly sources: readonly ResearchSource[];
  readonly valuationHeadlines: readonly ValuationHeadlinePoint[];
  readonly valuations: readonly ResolvedValuationObservation[];
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

function strongestSourceAuthority(observation: HeadlineCandidate): number {
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
  const [sourceCatalog, valuationFile, appearanceFile] = await Promise.all([
    parseYamlFile(join(researchDirectory, "sources.yml")).then((value) =>
      ResearchSourceCatalogSchema.parse(value)
    ),
    parseYamlFile(join(researchDirectory, "valuations.yml")).then((value) =>
      ValuationFileSchema.parse(value)
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

  const events = files.flatMap((file) =>
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
  const eventIds = events.map((event) => event.id);
  if (new Set(eventIds).size !== eventIds.length) {
    throw new Error("History event IDs must be globally unique");
  }
  const knownEventIds = new Set(eventIds);
  const eventById = new Map(events.map((event) => [event.id, event]));
  for (const event of events) {
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
  const annualVolumes = events.flatMap((event) =>
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
  for (const appearance of appearanceFile.appearances) {
    resolveSources(appearance.source_ids, sourceById, `Appearance ${appearance.id}`);
  }

  return {
    annualVolumes,
    appearances: appearanceFile.appearances,
    categories: files.map((file) => file.category).toSorted(
      (left, right) => left.order - right.order,
    ),
    events: events.toSorted((left, right) =>
      right.date.localeCompare(left.date)
      || left.categoryOrder - right.categoryOrder
      || left.id.localeCompare(right.id)
    ),
    files,
    sources: sourceCatalog.sources,
    valuationHeadlines: deriveValuationHeadlines(valuations),
    valuations,
  };
}
