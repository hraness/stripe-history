import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { z } from "zod";

import { CompactTextSchema, HttpsUrlSchema, PartialDateSchema } from "./history-schema";

export const STRIPE_HISTORY_APPEARANCE_BACKFILL_SCHEMA_VERSION =
  "stripe-history/appearance-backfill/v1" as const;

const ExactDateSchema = PartialDateSchema.refine(
  (value) => value.length === 10,
  "Backfill dates must include year, month, and day",
);

const AppearanceBackfillCandidateSchema = z.strictObject({
  participants: z.array(CompactTextSchema.max(100)).min(1).max(2),
  published_at: ExactDateSchema,
  review_status: z.literal("source-review-needed"),
  title: CompactTextSchema.max(240),
  url: HttpsUrlSchema,
});

export const AppearanceBackfillFileSchema = z.strictObject({
  candidates: z.array(AppearanceBackfillCandidateSchema).min(1).max(100),
  completed_at: z.iso.datetime({ offset: true }),
  counts: z.strictObject({
    already_reviewed_variants: z.number().int().nonnegative(),
    duplicate_variants: z.number().int().nonnegative(),
    excluded_hits: z.number().int().nonnegative(),
    raw_hits: z.number().int().positive(),
  }),
  monitor_id: z.literal("exa-stripe-leadership-appearances"),
  review_window: z.strictObject({
    from: ExactDateSchema,
    through: ExactDateSchema,
  }),
  schema: z.literal(STRIPE_HISTORY_APPEARANCE_BACKFILL_SCHEMA_VERSION),
  workflow_run: HttpsUrlSchema,
}).superRefine((file, context) => {
  if (file.review_window.from > file.review_window.through) {
    context.addIssue({
      code: "custom",
      message: "Backfill review window must be ordered",
      path: ["review_window"],
    });
  }
  const accountedHits = file.candidates.length
    + file.counts.already_reviewed_variants
    + file.counts.duplicate_variants
    + file.counts.excluded_hits;
  if (accountedHits !== file.counts.raw_hits) {
    context.addIssue({
      code: "custom",
      message: `Backfill accounting covers ${accountedHits} of ${file.counts.raw_hits} raw hits`,
      path: ["counts"],
    });
  }
  const urls = new Set<string>();
  for (const [index, candidate] of file.candidates.entries()) {
    if (
      candidate.published_at < file.review_window.from
      || candidate.published_at > file.review_window.through
    ) {
      context.addIssue({
        code: "custom",
        message: "Candidate date falls outside the reviewed window",
        path: ["candidates", index, "published_at"],
      });
    }
    if (urls.has(candidate.url)) {
      context.addIssue({
        code: "custom",
        message: "Candidate URLs must be unique",
        path: ["candidates", index, "url"],
      });
    }
    urls.add(candidate.url);
    const previous = file.candidates[index - 1];
    if (
      previous !== undefined
      && (
        previous.published_at < candidate.published_at
        || (
          previous.published_at === candidate.published_at
          && previous.title.localeCompare(candidate.title) > 0
        )
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Candidates must be reverse chronological, then title ordered",
        path: ["candidates", index],
      });
    }
  }
});

export type AppearanceBackfill = z.infer<typeof AppearanceBackfillFileSchema>;

const PROJECT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_PATH = join(
  PROJECT_DIRECTORY,
  "public",
  "research",
  "appearance-backfill.yml",
);

export async function loadAppearanceBackfill(
  path = DEFAULT_PATH,
): Promise<AppearanceBackfill> {
  return AppearanceBackfillFileSchema.parse(parse(await readFile(path, "utf8")) as unknown);
}
