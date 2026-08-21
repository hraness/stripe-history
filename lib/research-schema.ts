import { z } from "zod";

import {
  CompactTextSchema,
  HistorySourceSchema,
  HttpsUrlSchema,
  PartialDateSchema,
} from "./history-schema";
import {
  canonicalResearchSourceIdentity,
  stableResearchSourceId,
} from "./research-source-identity";

export const STRIPEDEX_SOURCE_CATALOG_SCHEMA_VERSION =
  "stripe-history/sources/v1" as const;
export const STRIPEDEX_VALUATIONS_SCHEMA_VERSION =
  "stripe-history/valuations/v1" as const;
export const STRIPEDEX_APPEARANCES_SCHEMA_VERSION =
  "stripe-history/appearances/v1" as const;
export const STRIPEDEX_RESEARCH_COLLECTIONS_SCHEMA_VERSION =
  "stripe-history/research-collections/v1" as const;
export const STRIPEDEX_RESEARCH_RUNS_SCHEMA_VERSION =
  "stripe-history/research-runs/v1" as const;

export const SourceIdSchema = z.string().regex(/^source-[a-f0-9]{20}$/u);

const uniqueValues = (
  values: readonly string[] | undefined,
  context: z.RefinementCtx,
  path: readonly PropertyKey[],
): void => {
  if (values !== undefined && new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "Values must be unique", path: [...path] });
  }
};

export const ResearchSourceSchema = HistorySourceSchema.extend({
  id: SourceIdSchema,
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/u).optional(),
  media_type: z.enum([
    "article",
    "filing",
    "pdf",
    "podcast",
    "transcript",
    "video",
    "webpage",
  ]),
  native_id: CompactTextSchema.max(160).optional(),
}).strict();

export const ResearchSourceCatalogSchema = z.strictObject({
  schema: z.literal(STRIPEDEX_SOURCE_CATALOG_SCHEMA_VERSION),
  sources: z.array(ResearchSourceSchema).min(1).max(1_000),
}).superRefine((catalog, context) => {
  const ids = catalog.sources.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Source IDs must be unique" });
  }
  const canonicalIdentities = new Map<string, string>();
  const nativeIdentities = new Map<string, string>();
  for (const [index, source] of catalog.sources.entries()) {
    const expectedId = stableResearchSourceId(source.url, source.published_at);
    if (source.id !== expectedId) {
      context.addIssue({
        code: "custom",
        message: `Source ID must equal ${expectedId}`,
        path: ["sources", index, "id"],
      });
    }
    const identity = canonicalResearchSourceIdentity(source.url, source.published_at);
    const duplicateId = canonicalIdentities.get(identity);
    if (duplicateId !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Source is canonical-equivalent to ${duplicateId}`,
        path: ["sources", index, "url"],
      });
    } else {
      canonicalIdentities.set(identity, source.id);
    }
    if (source.native_id !== undefined) {
      const nativeIdentity = `${source.media_type}:${source.native_id}`;
      const nativeDuplicateId = nativeIdentities.get(nativeIdentity);
      if (nativeDuplicateId !== undefined) {
        context.addIssue({
          code: "custom",
          message: `Native source identity is already used by ${nativeDuplicateId}`,
          path: ["sources", index, "native_id"],
        });
      } else {
        nativeIdentities.set(nativeIdentity, source.id);
      }
    }
  }
  for (let index = 1; index < catalog.sources.length; index += 1) {
    const previous = catalog.sources[index - 1];
    const current = catalog.sources[index];
    if (previous !== undefined && current !== undefined && previous.id > current.id) {
      context.addIssue({
        code: "custom",
        message: "Sources must be ordered by stable ID",
        path: ["sources", index, "id"],
      });
    }
  }
});

export const MonetaryClaimQualifierSchema = z.enum([
  "approximate",
  "exact",
  "lower-bound",
  "upper-bound",
]);

type MonetaryClaimQualifier = z.infer<typeof MonetaryClaimQualifierSchema>;

function parseScaledMoneyDisplay(
  display: string,
): Readonly<{ qualifier: MonetaryClaimQualifier; valueUsd: number }> | null {
  const match = /^(?:(~)|(more than )|(up to ))?\$(\d+(?:\.\d+)?) (million|billion)$/u
    .exec(display);
  if (match?.[4] === undefined || match[5] === undefined) return null;
  const [whole = "0", fraction = ""] = match[4].split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const multiplier = match[5] === "million" ? 1_000_000n : 1_000_000_000n;
  const numerator = BigInt(`${whole}${fraction}`) * multiplier;
  if (numerator % denominator !== 0n) return null;
  const value = numerator / denominator;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return {
    qualifier: match[1] !== undefined
      ? "approximate"
      : match[2] !== undefined
        ? "lower-bound"
        : match[3] !== undefined
          ? "upper-bound"
          : "exact",
    valueUsd: Number(value),
  };
}

function parseSharePriceDisplay(
  display: string,
): Readonly<{ qualifier: MonetaryClaimQualifier; valueUsd: number }> | null {
  const match = /^(?:(~)|(more than )|(up to ))?\$(\d+(?:\.\d{1,4})?)$/u.exec(display);
  if (match?.[4] === undefined) return null;
  return {
    qualifier: match[1] !== undefined
      ? "approximate"
      : match[2] !== undefined
        ? "lower-bound"
        : match[3] !== undefined
          ? "upper-bound"
          : "exact",
    valueUsd: Number(match[4]),
  };
}

function validateMonetaryClaim(
  claim: Readonly<{
    display: string;
    qualifier: MonetaryClaimQualifier;
    value_usd: number;
  }>,
  parsed: Readonly<{ qualifier: MonetaryClaimQualifier; valueUsd: number }> | null,
  context: z.RefinementCtx,
): void {
  if (parsed === null || parsed.valueUsd !== claim.value_usd) {
    context.addIssue({
      code: "custom",
      message: "Monetary display must equal value_usd",
      path: ["display"],
    });
  }
  if (parsed !== null && parsed.qualifier !== claim.qualifier) {
    context.addIssue({
      code: "custom",
      message: "Monetary display must agree with qualifier",
      path: ["qualifier"],
    });
  }
}

const moneyClaimFields = {
  currency: z.literal("USD"),
  display: CompactTextSchema.max(80),
  qualifier: MonetaryClaimQualifierSchema,
  value_usd: z.number().int().safe().positive(),
} as const;

const moneySchema = z.strictObject(moneyClaimFields).superRefine((claim, context) => {
  validateMonetaryClaim(claim, parseScaledMoneyDisplay(claim.display), context);
});

export const FinancingAmountStageSchema = z.enum([
  "agreements-signed",
  "completed",
  "reported-terms",
]);

const financingAmountSchema = z.strictObject({
  ...moneyClaimFields,
  stage: FinancingAmountStageSchema,
}).superRefine((claim, context) => {
  validateMonetaryClaim(claim, parseScaledMoneyDisplay(claim.display), context);
});

const sharePriceSchema = z.strictObject({
  currency: z.literal("USD"),
  display: CompactTextSchema.max(80),
  qualifier: MonetaryClaimQualifierSchema,
  value_usd: z.number().finite().positive(),
}).superRefine((claim, context) => {
  validateMonetaryClaim(claim, parseSharePriceDisplay(claim.display), context);
});

const valuationSchema = z.strictObject({
  ...moneyClaimFields,
  basis: z.enum([
    "common-stock-409a",
    "market-indication",
    "post-money",
    "pre-money",
    "transaction-implied",
    "unspecified",
  ]),
  precision: z.enum(["approximate-stated", "exact-stated", "inferred"]),
}).superRefine((claim, context) => {
  validateMonetaryClaim(claim, parseScaledMoneyDisplay(claim.display), context);
  const approximate = claim.qualifier === "approximate";
  if (
    (approximate && !["approximate-stated", "inferred"].includes(claim.precision))
    || (!approximate && claim.precision !== "exact-stated")
  ) {
    context.addIssue({
      code: "custom",
      message: "Valuation precision must agree with qualifier",
      path: ["precision"],
    });
  }
});

export const ValuationObservationSchema = z.strictObject({
  capital_transacted: moneySchema.optional(),
  confidence: z.enum(["confirmed", "reported", "indicative"]),
  date_precision: z.enum(["day", "month", "year"]),
  derivation: z.strictObject({
    formula: CompactTextSchema,
    inputs: z.array(z.strictObject({
      label: CompactTextSchema.max(100),
      value: CompactTextSchema.max(120),
    })).min(1).max(8),
  }).optional(),
  effective_date: PartialDateSchema,
  event_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120).optional(),
  financing_amount: financingAmountSchema.optional(),
  id: z.string().regex(/^valuation-[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(140),
  mechanism: z.enum([
    "company-tender",
    "internal-409a",
    "investor-secondary",
    "primary-financing",
    "secondary-market",
    "seed-financing",
  ]),
  notes: CompactTextSchema.optional(),
  reported_at: PartialDateSchema.optional(),
  share_price: sharePriceSchema.optional(),
  source_ids: z.array(SourceIdSchema).min(1).max(12),
  status: z.enum([
    "agreements-signed",
    "company-confirmed",
    "completed",
    "reported",
    "retrospective",
  ]),
  title: CompactTextSchema.max(180),
  valuation: valuationSchema,
}).superRefine((observation, context) => {
  const expectedPrecision = observation.effective_date.length === 4
    ? "year"
    : observation.effective_date.length === 7
      ? "month"
      : "day";
  if (observation.date_precision !== expectedPrecision) {
    context.addIssue({
      code: "custom",
      message: `date_precision must be ${expectedPrecision}`,
      path: ["date_precision"],
    });
  }
  if ((observation.valuation.precision === "inferred") !== (observation.derivation !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Only inferred valuations require a derivation",
      path: ["derivation"],
    });
  }
  if (
    observation.mechanism === "internal-409a"
    && observation.valuation.basis !== "common-stock-409a"
  ) {
    context.addIssue({
      code: "custom",
      message: "Internal marks require the common-stock-409a basis",
      path: ["valuation", "basis"],
    });
  }
  if (
    observation.mechanism === "secondary-market"
    && observation.valuation.basis !== "market-indication"
  ) {
    context.addIssue({
      code: "custom",
      message: "Secondary-market observations require the market-indication basis",
      path: ["valuation", "basis"],
    });
  }
  if (
    observation.mechanism === "investor-secondary"
    && observation.valuation.basis !== "transaction-implied"
  ) {
    context.addIssue({
      code: "custom",
      message: "Investor secondaries require the transaction-implied basis",
      path: ["valuation", "basis"],
    });
  }
  if (
    observation.mechanism === "company-tender"
    && observation.valuation.basis !== "transaction-implied"
  ) {
    context.addIssue({
      code: "custom",
      message: "Company tenders require the transaction-implied basis",
      path: ["valuation", "basis"],
    });
  }
  if (
    ["primary-financing", "seed-financing"].includes(observation.mechanism)
    && ["common-stock-409a", "market-indication"].includes(observation.valuation.basis)
  ) {
    context.addIssue({
      code: "custom",
      message: "Financing observations cannot use an internal-mark or market-indication basis",
      path: ["valuation", "basis"],
    });
  }
  if (
    observation.financing_amount !== undefined
    && !["primary-financing", "seed-financing"].includes(observation.mechanism)
  ) {
    context.addIssue({
      code: "custom",
      message: "Financing amounts require a financing mechanism",
      path: ["financing_amount"],
    });
  }
  if (observation.financing_amount?.stage === "agreements-signed"
    && observation.status !== "agreements-signed") {
    context.addIssue({
      code: "custom",
      message: "Signed-agreement financing amounts require agreements-signed status",
      path: ["financing_amount", "stage"],
    });
  }
  if (observation.financing_amount?.stage === "completed"
    && !["company-confirmed", "completed"].includes(observation.status)) {
    context.addIssue({
      code: "custom",
      message: "Completed financing amounts require completed or company-confirmed status",
      path: ["financing_amount", "stage"],
    });
  }
  if (observation.financing_amount?.stage === "reported-terms"
    && !["reported", "retrospective"].includes(observation.status)) {
    context.addIssue({
      code: "custom",
      message: "Reported financing terms require reported or retrospective status",
      path: ["financing_amount", "stage"],
    });
  }
  uniqueValues(observation.source_ids, context, ["source_ids"]);
});

export const ValuationFileSchema = z.strictObject({
  observations: z.array(ValuationObservationSchema).min(1).max(200),
  schema: z.literal(STRIPEDEX_VALUATIONS_SCHEMA_VERSION),
}).superRefine((file, context) => {
  const ids = file.observations.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Valuation IDs must be unique" });
  }
  for (let index = 1; index < file.observations.length; index += 1) {
    const previous = file.observations[index - 1];
    const current = file.observations[index];
    if (
      previous !== undefined
      && current !== undefined
      && (previous.effective_date < current.effective_date
        || (previous.effective_date === current.effective_date && previous.id > current.id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Valuations must be reverse chronological",
        path: ["observations", index, "effective_date"],
      });
    }
  }
});

const TranscriptSchema = z.discriminatedUnion("availability", [
  z.strictObject({ availability: z.literal("none") }),
  z.strictObject({
    availability: z.enum(["automatic", "official", "third-party"]),
    language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/u),
    source_id: SourceIdSchema,
  }),
]);

const AppearanceDigestSchema = z.strictObject({
  gist: z.string().trim().refine(
    (value) => {
      const words = value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? [];
      return words.length >= 35 && words.length <= 100 && !/[\r\n]/u.test(value);
    },
    "Appearance gist must be one paragraph of 35 through 100 words",
  ),
  ideas: z.array(z.strictObject({
    detail: CompactTextSchema.max(320),
    title: CompactTextSchema.max(100),
  })).min(3).max(5),
});

function partialDatePrecedes(left: string, right: string): boolean {
  const leftParts = left.split("-").map(Number);
  const rightParts = right.split("-").map(Number);
  const sharedPrecision = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < sharedPrecision; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined || rightPart === undefined) return false;
    if (leftPart !== rightPart) return leftPart < rightPart;
  }
  return false;
}

export const AppearanceSchema = z.strictObject({
  date_precision: z.enum(["day", "month", "year"]),
  duration_precision: z.enum(["approximate", "exact"]).optional(),
  duration_seconds: z.number().int().positive().max(8 * 60 * 60).optional(),
  historical_periods: z.array(
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  ).max(12),
  id: z.string().regex(/^appearance-[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(160),
  media: z.array(z.enum(["article", "podcast", "testimony", "transcript", "video"]))
    .min(1).max(5),
  occurred_at: PartialDateSchema,
  participants: z.array(z.strictObject({
    name: CompactTextSchema.max(100),
    role: z.enum(["guest", "interviewee", "speaker", "witness"]),
    stripe_role: CompactTextSchema.max(140).optional(),
  })).min(1).max(2),
  published_at: PartialDateSchema.optional(),
  review_status: z.literal("reviewed"),
  series: CompactTextSchema.max(120).optional(),
  digest: AppearanceDigestSchema.optional(),
  significance: z.string().trim().min(30).max(600).refine(
    (value) => !/[\r\n]/u.test(value),
    "Significance must be one paragraph",
  ),
  source_ids: z.array(SourceIdSchema).min(1).max(8),
  title: CompactTextSchema.max(180),
  topics: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)).min(1).max(16),
  transcript: TranscriptSchema,
  venue: CompactTextSchema.max(120),
}).superRefine((appearance, context) => {
  const expectedPrecision = appearance.occurred_at.length === 4
    ? "year"
    : appearance.occurred_at.length === 7
      ? "month"
      : "day";
  if (appearance.date_precision !== expectedPrecision) {
    context.addIssue({
      code: "custom",
      message: `date_precision must be ${expectedPrecision}`,
      path: ["date_precision"],
    });
  }
  if (
    (appearance.duration_seconds === undefined)
      !== (appearance.duration_precision === undefined)
  ) {
    context.addIssue({
      code: "custom",
      message: "Appearance duration and duration_precision must be declared together",
      path: [appearance.duration_seconds === undefined
        ? "duration_seconds"
        : "duration_precision"],
    });
  }
  uniqueValues(appearance.source_ids, context, ["source_ids"]);
  uniqueValues(appearance.media, context, ["media"]);
  uniqueValues(appearance.topics, context, ["topics"]);
  uniqueValues(appearance.historical_periods, context, ["historical_periods"]);
  const participantNames = appearance.participants.map(({ name }) => name);
  uniqueValues(participantNames, context, ["participants"]);
  if (
    appearance.transcript.availability !== "none"
    && !appearance.source_ids.includes(appearance.transcript.source_id)
  ) {
    context.addIssue({
      code: "custom",
      message: "Transcript source must belong to the appearance",
      path: ["transcript", "source_id"],
    });
  }
  if (
    appearance.media.includes("transcript")
    !== (appearance.transcript.availability !== "none")
  ) {
    context.addIssue({
      code: "custom",
      message: "Transcript media and availability must agree",
      path: ["media"],
    });
  }
  if (
    appearance.published_at !== undefined
    && partialDatePrecedes(appearance.published_at, appearance.occurred_at)
  ) {
    context.addIssue({
      code: "custom",
      message: "Appearance publication must not precede the occurrence",
      path: ["published_at"],
    });
  }
});

export const AppearanceFileSchema = z.strictObject({
  appearances: z.array(AppearanceSchema).min(1).max(300),
  schema: z.literal(STRIPEDEX_APPEARANCES_SCHEMA_VERSION),
}).superRefine((file, context) => {
  const ids = file.appearances.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Appearance IDs must be unique" });
  }
  for (let index = 1; index < file.appearances.length; index += 1) {
    const previous = file.appearances[index - 1];
    const current = file.appearances[index];
    if (
      previous !== undefined
      && current !== undefined
      && (previous.occurred_at < current.occurred_at
        || (previous.occurred_at === current.occurred_at && previous.id > current.id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Appearances must be reverse chronological",
        path: ["appearances", index, "occurred_at"],
      });
    }
  }
});

const researchCollectionFields = {
  authority_order: z.array(z.enum([
    "primary",
    "filing",
    "interview",
    "reporting",
    "archive",
  ])).min(1).max(5),
  capture_policy: z.enum(["all-accepted", "primary-and-claim-critical"]),
  supporting_source_ids: z.array(SourceIdSchema).max(300),
  coverage: z.strictObject({
    basis: z.enum(["effective-date", "event-date", "occurred-at"]),
    from: PartialDateSchema,
    through: PartialDateSchema,
  }),
  dedupe_keys: z.array(z.enum([
    "appearance-participants-venue-occurred-at",
    "canonical-url-published-at",
    "event-id",
    "native-id",
    "semantic-claim",
    "valuation-mechanism-effective-date",
  ])).min(1).max(12),
  discovery_sources: z.array(HttpsUrlSchema).min(1).max(30),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  input_source_ids: z.array(SourceIdSchema).min(1).max(300),
  output_files: z.array(
    z.string().regex(/^(?:history|research)\/[a-z0-9-]+\.yml$/u),
  ).min(1).max(20),
  query_families: z.array(CompactTextSchema.max(160)).min(1).max(40),
  refresh: z.strictObject({
    cadence: z.enum(["annual", "monthly", "quarterly"]),
    lookback_days: z.number().int().min(0).max(400),
    minimum_request_interval_ms: z.number().int().min(0).max(60_000),
    mode: z.enum(["curated-primary", "fixed-source-refetch", "incremental-discovery"]),
  }),
  scope: CompactTextSchema,
} as const;

export const ResearchCollectionSchema = z.discriminatedUnion("dataset", [
  z.strictObject({
    ...researchCollectionFields,
    dataset: z.literal("appearances"),
  }),
  z.strictObject({
    ...researchCollectionFields,
    dataset: z.literal("history-events"),
    history_output_coverage: z.enum(["complete-output", "selected-inputs"]),
  }),
  z.strictObject({
    ...researchCollectionFields,
    dataset: z.literal("valuations"),
  }),
]).superRefine((collection, context) => {
  if (collection.coverage.from > collection.coverage.through) {
    context.addIssue({
      code: "custom",
      message: "Coverage start must not follow coverage end",
      path: ["coverage", "from"],
    });
  }
  for (const field of [
    "authority_order",
    "dedupe_keys",
    "discovery_sources",
    "input_source_ids",
    "output_files",
    "query_families",
    "supporting_source_ids",
  ] as const) {
    uniqueValues(collection[field], context, [field]);
  }
  const sortedSourceIds = collection.input_source_ids.toSorted();
  if (collection.input_source_ids.some((value, index) => value !== sortedSourceIds[index])) {
    context.addIssue({
      code: "custom",
      message: "Input source IDs must be ordered by stable ID",
      path: ["input_source_ids"],
    });
  }
});

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const ExactDateSchema = PartialDateSchema.refine(
  (value) => value.length === 10,
  "Date must have day precision",
);
const CaptureSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(180);
const CaptureEvidencePathSchema = z.string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u)
  .max(240)
  .refine(
    (value) => !value.startsWith("/") && !value.split("/").includes(".."),
    "Capture evidence path must stay inside its bundle",
  );

const captureEvidenceBase = {
  capture_slug: CaptureSlugSchema,
  captured_on: ExactDateSchema,
} as const;

export const ResearchCaptureEvidenceSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...captureEvidenceBase,
    evidence_path: CaptureEvidencePathSchema,
    sha256: Sha256Schema,
    status: z.literal("complete"),
  }),
  z.strictObject({
    ...captureEvidenceBase,
    evidence_path: CaptureEvidencePathSchema,
    limitation: CompactTextSchema,
    sha256: Sha256Schema,
    status: z.literal("partial"),
  }),
  z.strictObject({
    ...captureEvidenceBase,
    limitation: CompactTextSchema,
    status: z.literal("blocked"),
  }),
]);

const ResearchDiscoveryPlanTaskSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    id: z.string().regex(/^task-[a-f0-9]{20}$/u),
    kind: z.literal("discovery-source"),
    url: HttpsUrlSchema,
  }),
  z.strictObject({
    id: z.string().regex(/^task-[a-f0-9]{20}$/u),
    kind: z.literal("query-family"),
    query: CompactTextSchema.max(160),
  }),
]);

export const ResearchDiscoveryPlanSchema = z.strictObject({
  acceptedInputSha256: Sha256Schema,
  acceptedSourceIds: z.array(SourceIdSchema).min(1).max(300),
  authorityOrder: z.array(z.enum([
    "primary",
    "filing",
    "interview",
    "reporting",
    "archive",
  ])).min(1).max(5),
  collection: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  dataset: z.enum(["appearances", "history-events", "valuations"]),
  dedupeKeys: z.array(z.enum([
    "appearance-participants-venue-occurred-at",
    "canonical-url-published-at",
    "event-id",
    "native-id",
    "semantic-claim",
    "valuation-mechanism-effective-date",
  ])).min(1).max(12),
  minimumRequestIntervalMs: z.number().int().min(0).max(60_000),
  outputFiles: z.array(
    z.string().regex(/^(?:history|research)\/[a-z0-9-]+\.yml$/u),
  ).min(1).max(20),
  planSha256: Sha256Schema,
  reviewRequirements: z.tuple([
    z.literal("canonical-and-native-identity"),
    z.literal("semantic-claim-deduplication"),
    z.literal("source-capture-before-acceptance"),
    z.literal("human-significance-review"),
    z.literal("advance-watermark-after-complete-review"),
  ]),
  schema: z.literal("stripe-history/research-discovery-plan/v1"),
  tasks: z.array(ResearchDiscoveryPlanTaskSchema).min(1).max(100),
  watermark: z.strictObject({
    lookbackFrom: ExactDateSchema,
    reviewedThrough: ExactDateSchema,
    targetThrough: ExactDateSchema,
  }),
});

const researchRunTaskBase = {
  id: z.string().regex(/^task-[a-f0-9]{20}$/u),
} as const;

const ResearchRunTaskSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...researchRunTaskBase,
    status: z.literal("pending"),
  }),
  z.strictObject({
    ...researchRunTaskBase,
    limitation: CompactTextSchema,
    status: z.literal("blocked"),
  }),
  z.strictObject({
    ...researchRunTaskBase,
    completed_on: ExactDateSchema,
    decision_ids: z.array(z.string().regex(/^candidate-[a-f0-9]{20}$/u)).max(500),
    outcome: z.enum(["candidates-reviewed", "no-candidates"]),
    status: z.literal("complete"),
  }).superRefine((task, context) => {
    if ((task.outcome === "no-candidates") !== (task.decision_ids.length === 0)) {
      context.addIssue({
        code: "custom",
        message: "No-candidate tasks must have no decisions; reviewed tasks need decisions",
        path: ["decision_ids"],
      });
    }
    uniqueValues(task.decision_ids, context, ["decision_ids"]);
  }),
]);

const researchDecisionBase = {
  candidate_id: z.string().regex(/^candidate-[a-f0-9]{20}$/u),
  candidate_url: HttpsUrlSchema,
  native_id: CompactTextSchema.max(160).optional(),
  reason: CompactTextSchema,
  task_ids: z.array(z.string().regex(/^task-[a-f0-9]{20}$/u)).min(1).max(100),
} as const;

const ResearchCandidateDecisionSchema = z.discriminatedUnion("disposition", [
  z.strictObject({
    ...researchDecisionBase,
    disposition: z.literal("accepted"),
    evidence: ResearchCaptureEvidenceSchema,
    source_id: SourceIdSchema,
  }),
  z.strictObject({
    ...researchDecisionBase,
    disposition: z.literal("duplicate"),
    duplicate_of_source_id: SourceIdSchema,
    evidence: ResearchCaptureEvidenceSchema.optional(),
  }),
  z.strictObject({
    ...researchDecisionBase,
    disposition: z.literal("rejected"),
    evidence: ResearchCaptureEvidenceSchema.optional(),
  }),
]);

const researchBackfillDecisionBase = {
  candidate_id: z.string().regex(/^candidate-[a-f0-9]{20}$/u),
  candidate_url: HttpsUrlSchema,
  native_id: CompactTextSchema.max(160).optional(),
  reason: CompactTextSchema,
} as const;

const ResearchBackfillDecisionSchema = z.discriminatedUnion("disposition", [
  z.strictObject({
    ...researchBackfillDecisionBase,
    disposition: z.literal("accepted"),
    evidence: ResearchCaptureEvidenceSchema,
    source_id: SourceIdSchema,
  }),
  z.strictObject({
    ...researchBackfillDecisionBase,
    disposition: z.literal("duplicate"),
    duplicate_of_source_id: SourceIdSchema,
    evidence: ResearchCaptureEvidenceSchema.optional(),
  }),
  z.strictObject({
    ...researchBackfillDecisionBase,
    disposition: z.literal("rejected"),
    evidence: ResearchCaptureEvidenceSchema.optional(),
  }),
]);

const ResearchBaselineImportRunSchema = z.strictObject({
  accepted_input_sha256: Sha256Schema,
  candidate_history: z.literal("not-reconstructible-pre-ledger"),
  collection: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  completed_on: ExactDateSchema,
  import_note: CompactTextSchema,
  imported_source_ids: z.array(SourceIdSchema).min(1).max(300),
  kind: z.literal("baseline-import"),
  plan_sha256: Sha256Schema,
  status: z.literal("complete"),
  target_through: ExactDateSchema,
}).superRefine((run, context) => {
  if (run.target_through > run.completed_on) {
    context.addIssue({
      code: "custom",
      message: "Baseline target must not follow its completion date",
      path: ["target_through"],
    });
  }
});

const ResearchDiscoveryRunSchema = z.strictObject({
  collection: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  completed_on: ExactDateSchema.optional(),
  decisions: z.array(ResearchCandidateDecisionSchema).max(2_000),
  kind: z.literal("discovery"),
  plan: ResearchDiscoveryPlanSchema,
  recorded_on: ExactDateSchema,
  status: z.enum(["blocked", "complete", "in-progress"]),
  tasks: z.array(ResearchRunTaskSchema).min(1).max(100),
}).superRefine((run, context) => {
  if ((run.status === "complete") !== (run.completed_on !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Only complete discovery runs require completed_on",
      path: ["completed_on"],
    });
  }
  if (run.completed_on !== undefined && run.recorded_on > run.completed_on) {
    context.addIssue({
      code: "custom",
      message: "Discovery run must be recorded by its completion date",
      path: ["recorded_on"],
    });
  }
  if (
    run.completed_on !== undefined
    && run.plan.watermark.targetThrough > run.completed_on
  ) {
    context.addIssue({
      code: "custom",
      message: "Discovery target must not follow its completion date",
      path: ["plan", "watermark", "targetThrough"],
    });
  }
  uniqueValues(run.tasks.map(({ id }) => id), context, ["tasks"]);
  uniqueValues(run.decisions.map(({ candidate_id: id }) => id), context, ["decisions"]);
  const sortedTasks = run.tasks.map(({ id }) => id).toSorted();
  if (run.tasks.some(({ id }, index) => id !== sortedTasks[index])) {
    context.addIssue({ code: "custom", message: "Run tasks must be ordered by ID", path: ["tasks"] });
  }
  const sortedDecisions = run.decisions.map(({ candidate_id: id }) => id).toSorted();
  if (run.decisions.some(({ candidate_id: id }, index) => id !== sortedDecisions[index])) {
    context.addIssue({
      code: "custom",
      message: "Candidate decisions must be ordered by ID",
      path: ["decisions"],
    });
  }
});

const ResearchBackfillRunSchema = z.strictObject({
  accepted_input_sha256: Sha256Schema,
  accepted_source_ids: z.array(SourceIdSchema).min(1).max(300),
  artifact_url: HttpsUrlSchema,
  collection: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  completed_on: ExactDateSchema,
  decisions: z.array(ResearchBackfillDecisionSchema).min(1).max(2_000),
  kind: z.literal("backfill"),
  plan_sha256: Sha256Schema,
  recorded_on: ExactDateSchema,
  review_window: z.strictObject({
    from: ExactDateSchema,
    through: ExactDateSchema,
  }),
  status: z.literal("complete"),
}).superRefine((run, context) => {
  if (run.recorded_on > run.completed_on) {
    context.addIssue({
      code: "custom",
      message: "Backfill run must be recorded by its completion date",
      path: ["recorded_on"],
    });
  }
  if (run.review_window.from > run.review_window.through) {
    context.addIssue({
      code: "custom",
      message: "Backfill review window must be chronological",
      path: ["review_window"],
    });
  }
  if (run.review_window.through > run.completed_on) {
    context.addIssue({
      code: "custom",
      message: "Backfill review window must not follow its completion date",
      path: ["review_window", "through"],
    });
  }
  uniqueValues(run.accepted_source_ids, context, ["accepted_source_ids"]);
  uniqueValues(run.decisions.map(({ candidate_id: id }) => id), context, ["decisions"]);
  const sortedInputs = run.accepted_source_ids.toSorted();
  if (run.accepted_source_ids.some((id, index) => id !== sortedInputs[index])) {
    context.addIssue({
      code: "custom",
      message: "Backfill accepted inputs must be ordered by source ID",
      path: ["accepted_source_ids"],
    });
  }
  const sortedDecisions = run.decisions.map(({ candidate_id: id }) => id).toSorted();
  if (run.decisions.some(({ candidate_id: id }, index) => id !== sortedDecisions[index])) {
    context.addIssue({
      code: "custom",
      message: "Backfill candidate decisions must be ordered by ID",
      path: ["decisions"],
    });
  }
});

export const ResearchRunLedgerSchema = z.strictObject({
  runs: z.array(z.discriminatedUnion("kind", [
    ResearchBaselineImportRunSchema,
    ResearchBackfillRunSchema,
    ResearchDiscoveryRunSchema,
  ])).min(1).max(500),
  schema: z.literal(STRIPEDEX_RESEARCH_RUNS_SCHEMA_VERSION),
}).superRefine((ledger, context) => {
  const keys = ledger.runs.map((run) => {
    if (run.kind === "baseline-import") {
      return `${run.collection}:${run.target_through}:0-baseline:${run.plan_sha256}`;
    }
    if (run.kind === "discovery") {
      return `${run.collection}:${run.plan.watermark.targetThrough}:1-discovery:${run.plan.planSha256}`;
    }
    return `${run.collection}:${run.completed_on}:2-backfill:${run.plan_sha256}`;
  });
  uniqueValues(keys, context, ["runs"]);
  const sortedKeys = keys.toSorted();
  if (keys.some((key, index) => key !== sortedKeys[index])) {
    context.addIssue({
      code: "custom",
      message: "Research runs must be ordered by collection, target, and plan digest",
      path: ["runs"],
    });
  }
});

export const ResearchCollectionsFileSchema = z.strictObject({
  collections: z.array(ResearchCollectionSchema).min(1).max(20),
  mutable_sources: z.array(z.strictObject({
    canonical_url: HttpsUrlSchema,
    capture_evidence: ResearchCaptureEvidenceSchema,
    policy: z.literal("date-stamped-snapshots"),
    rationale: CompactTextSchema,
    source_ids: z.array(SourceIdSchema).min(2).max(100),
  })).max(50),
  schema: z.literal(STRIPEDEX_RESEARCH_COLLECTIONS_SCHEMA_VERSION),
}).superRefine((file, context) => {
  const ids = file.collections.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Research collection IDs must be unique" });
  }
  const sortedIds = ids.toSorted();
  if (ids.some((value, index) => value !== sortedIds[index])) {
    context.addIssue({
      code: "custom",
      message: "Research collections must be ordered by ID",
      path: ["collections"],
    });
  }
  const mutableUrls = file.mutable_sources.map(({ canonical_url: url }) => url);
  uniqueValues(mutableUrls, context, ["mutable_sources"]);
  for (const [index, mutableSource] of file.mutable_sources.entries()) {
    uniqueValues(mutableSource.source_ids, context, ["mutable_sources", index, "source_ids"]);
    const sortedSourceIds = mutableSource.source_ids.toSorted();
    if (mutableSource.source_ids.some((value, sourceIndex) => value !== sortedSourceIds[sourceIndex])) {
      context.addIssue({
        code: "custom",
        message: "Mutable source snapshot IDs must be ordered by stable ID",
        path: ["mutable_sources", index, "source_ids"],
      });
    }
  }
});

export type Appearance = z.infer<typeof AppearanceSchema>;
export type ResearchCollection = z.infer<typeof ResearchCollectionSchema>;
export type ResearchRun = z.infer<typeof ResearchRunLedgerSchema>["runs"][number];
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
export type ValuationObservation = z.infer<typeof ValuationObservationSchema>;
