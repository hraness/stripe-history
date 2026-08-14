import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import {
  HistoryFileSchema,
  historyCategoryIds,
  type HistoryEvent,
  type HistoryFile,
} from "./history-schema";

const PROJECT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIRECTORY = join(PROJECT_DIRECTORY, "public");
const HISTORY_DIRECTORY = join(PUBLIC_DIRECTORY, "history");

async function parseYamlFile(path: string): Promise<unknown> {
  return parse(await readFile(path, "utf8")) as unknown;
}

export interface CategorizedHistoryEvent extends HistoryEvent {
  readonly categoryId: HistoryFile["category"]["id"];
  readonly categoryLabel: string;
  readonly categoryOrder: number;
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

export interface HistoryCollection {
  readonly annualVolumes: readonly AnnualVolumePoint[];
  readonly categories: readonly HistoryFile["category"][];
  readonly events: readonly CategorizedHistoryEvent[];
  readonly files: readonly HistoryFile[];
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

export async function loadHistory(
  directory = HISTORY_DIRECTORY,
): Promise<HistoryCollection> {
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
    file.events.map((event) => ({
      ...event,
      categoryId: file.category.id,
      categoryLabel: file.category.label,
      categoryOrder: file.category.order,
    }))
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

  return {
    annualVolumes,
    categories: files.map((file) => file.category).toSorted(
      (left, right) => left.order - right.order,
    ),
    events: events.toSorted((left, right) =>
      right.date.localeCompare(left.date)
      || left.categoryOrder - right.categoryOrder
      || left.id.localeCompare(right.id)
    ),
    files,
  };
}
