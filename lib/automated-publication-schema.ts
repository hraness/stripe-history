import { z } from "zod";

import {
  CompactTextSchema,
  HttpsUrlSchema,
  historyCategoryIds,
} from "./history-schema";
import { SourceIdSchema } from "./research-schema";

export const STRIPE_HISTORY_AUTOMATED_PUBLICATION_POLICY_SCHEMA_VERSION =
  "stripe-history/automated-publication-policy/v1" as const;
export const STRIPE_HISTORY_AUTOMATED_PUBLICATIONS_SCHEMA_VERSION =
  "stripe-history/automated-publications/v1" as const;
export const STRIPE_HISTORY_AUTOMATED_DECISIONS_SCHEMA_VERSION =
  "stripe-history/automated-decisions/v1" as const;

export const automatedHistoryCategoryIds = historyCategoryIds;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const ExactDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const AutomatedPublicationPolicySchema = z.strictObject({
  auto_publish_categories: z.array(z.enum(automatedHistoryCategoryIds)).min(1).max(11),
  historical_proposal_prompt_versions: z.array(CompactTextSchema.max(120)).max(20),
  historical_review_prompt_versions: z.array(CompactTextSchema.max(120)).max(20),
  max_candidates_per_run: z.number().int().min(1).max(6),
  max_publications_per_run: z.number().int().min(1).max(3),
  max_source_characters: z.number().int().min(5_000).max(80_000),
  model: z.literal("openai/gpt-5.6-sol"),
  proposal_prompt_version: z.string().regex(/^[a-z0-9]+(?:[./-][a-z0-9]+)*$/u),
  reasoning_effort: z.literal("max"),
  review_prompt_version: z.string().regex(/^[a-z0-9]+(?:[./-][a-z0-9]+)*$/u),
  schema: z.literal(STRIPE_HISTORY_AUTOMATED_PUBLICATION_POLICY_SCHEMA_VERSION),
  trusted_monitors: z.array(
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  ).min(1).max(12),
}).superRefine((policy, context) => {
  for (const field of ["auto_publish_categories", "trusted_monitors"] as const) {
    if (new Set(policy[field]).size !== policy[field].length) {
      context.addIssue({ code: "custom", message: `${field} values must be unique`, path: [field] });
    }
  }
  for (const [currentField, historyField] of [
    ["proposal_prompt_version", "historical_proposal_prompt_versions"],
    ["review_prompt_version", "historical_review_prompt_versions"],
  ] as const) {
    const historical = policy[historyField];
    if (new Set(historical).size !== historical.length) {
      context.addIssue({
        code: "custom",
        message: `${historyField} values must be unique`,
        path: [historyField],
      });
    }
    if (historical.includes(policy[currentField])) {
      context.addIssue({
        code: "custom",
        message: `${historyField} cannot repeat the current prompt version`,
        path: [historyField],
      });
    }
  }
});

export const AutomatedPublicationDecisionSchema = z.strictObject({
  candidate_url: HttpsUrlSchema,
  category: z.enum(automatedHistoryCategoryIds),
  disposition: z.enum(["published-new-event", "source-added-to-event"]),
  evidence_quote_sha256: z.array(Sha256Schema).min(1).max(12),
  evidence_sha256: Sha256Schema,
  event_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120),
  proposal_sha256: Sha256Schema,
  review_sha256: Sha256Schema,
  source_id: SourceIdSchema,
}).superRefine((decision, context) => {
  if (new Set(decision.evidence_quote_sha256).size !== decision.evidence_quote_sha256.length) {
    context.addIssue({
      code: "custom",
      message: "Evidence quote digests must be unique",
      path: ["evidence_quote_sha256"],
    });
  }
});

export const AutomatedPublicationRunSchema = z.strictObject({
  candidate_digest_sha256: Sha256Schema,
  decisions: z.array(AutomatedPublicationDecisionSchema).min(1).max(3),
  id: z.string().regex(/^publication-[a-f0-9]{20}$/u),
  model: z.literal("openai/gpt-5.6-sol"),
  proposal_prompt_version: CompactTextSchema.max(120),
  published_on: ExactDateSchema,
  reasoning_effort: z.literal("max"),
  review_mode: z.literal("independent-grounded-second-pass"),
  review_prompt_version: CompactTextSchema.max(120),
}).superRefine((run, context) => {
  const urls = run.decisions.map(({ candidate_url: url }) => url);
  if (new Set(urls).size !== urls.length) {
    context.addIssue({ code: "custom", message: "Run candidate URLs must be unique", path: ["decisions"] });
  }
  const ordered = [...urls].toSorted();
  if (urls.some((url, index) => url !== ordered[index])) {
    context.addIssue({ code: "custom", message: "Run decisions must be ordered by URL", path: ["decisions"] });
  }
});

export const AutomatedPublicationLedgerSchema = z.strictObject({
  runs: z.array(AutomatedPublicationRunSchema).max(500),
  schema: z.literal(STRIPE_HISTORY_AUTOMATED_PUBLICATIONS_SCHEMA_VERSION),
}).superRefine((ledger, context) => {
  const ids = ledger.runs.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Publication run IDs must be unique", path: ["runs"] });
  }
  for (let index = 1; index < ledger.runs.length; index += 1) {
    const previous = ledger.runs[index - 1];
    const current = ledger.runs[index];
    if (
      previous !== undefined
      && current !== undefined
      && (previous.published_on < current.published_on
        || (previous.published_on === current.published_on && previous.id > current.id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Publication runs must be reverse chronological",
        path: ["runs", index],
      });
    }
  }
});

export const AutomatedDecisionOutcomeSchema = z.enum([
  "corroborating-existing-event",
  "deferred",
  "infrastructure-error",
  "needs-review",
  "published-new-event",
  "rejected",
  "source-added-to-event",
]);

export const AutomatedDecisionBasisSchema = z.enum([
  "automatic-policy",
  "compiler",
  "manual-migration",
  "proposal",
  "review",
]);

export const AutomatedDecisionSchema = z.strictObject({
  basis: AutomatedDecisionBasisSchema,
  candidate_url: HttpsUrlSchema,
  category: z.enum(historyCategoryIds).optional(),
  event_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120).optional(),
  outcome: AutomatedDecisionOutcomeSchema,
  proposal_sha256: Sha256Schema.optional(),
  reason: CompactTextSchema,
  review_sha256: Sha256Schema.optional(),
  title: CompactTextSchema.max(240),
}).superRefine((decision, context) => {
  const bindsExistingEvent = decision.outcome === "corroborating-existing-event"
    || decision.outcome === "published-new-event"
    || decision.outcome === "source-added-to-event";
  if (bindsExistingEvent && (decision.category === undefined || decision.event_id === undefined)) {
    context.addIssue({
      code: "custom",
      message: `${decision.outcome} requires category and event_id`,
    });
  }
  if ((decision.category === undefined) !== (decision.event_id === undefined)) {
    context.addIssue({
      code: "custom",
      message: "category and event_id must be present together",
    });
  }
  if (decision.basis === "proposal" && decision.proposal_sha256 === undefined) {
    context.addIssue({
      code: "custom",
      message: "Proposal decisions require proposal_sha256",
      path: ["proposal_sha256"],
    });
  }
  if (decision.basis === "review"
    && (decision.proposal_sha256 === undefined || decision.review_sha256 === undefined)) {
    context.addIssue({
      code: "custom",
      message: "Review decisions require proposal_sha256 and review_sha256",
    });
  }
  if (decision.review_sha256 !== undefined && decision.proposal_sha256 === undefined) {
    context.addIssue({
      code: "custom",
      message: "review_sha256 requires proposal_sha256",
      path: ["review_sha256"],
    });
  }
  if (
    (decision.outcome === "published-new-event"
      || decision.outcome === "source-added-to-event")
    && decision.basis !== "review"
  ) {
    context.addIssue({
      code: "custom",
      message: `${decision.outcome} requires an independent review decision`,
      path: ["basis"],
    });
  }
});

export const AutomatedDecisionRunSchema = z.strictObject({
  candidate_digest_sha256: Sha256Schema,
  decided_on: ExactDateSchema,
  decisions: z.array(AutomatedDecisionSchema).min(1).max(250),
  id: z.string().regex(/^decision-run-[a-f0-9]{20}$/u),
  model: z.literal("openai/gpt-5.6-sol"),
  proposal_prompt_version: CompactTextSchema.max(120),
  reasoning_effort: z.literal("max"),
  review_prompt_version: CompactTextSchema.max(120),
}).superRefine((run, context) => {
  const urls = run.decisions.map(({ candidate_url: url }) => url);
  if (new Set(urls).size !== urls.length) {
    context.addIssue({ code: "custom", message: "Run candidate URLs must be unique", path: ["decisions"] });
  }
  const ordered = [...urls].toSorted();
  if (urls.some((url, index) => url !== ordered[index])) {
    context.addIssue({ code: "custom", message: "Run decisions must be ordered by URL", path: ["decisions"] });
  }
});

export const AutomatedDecisionLedgerSchema = z.strictObject({
  runs: z.array(AutomatedDecisionRunSchema).max(500),
  schema: z.literal(STRIPE_HISTORY_AUTOMATED_DECISIONS_SCHEMA_VERSION),
}).superRefine((ledger, context) => {
  const ids = ledger.runs.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Decision run IDs must be unique", path: ["runs"] });
  }
  const inputs = ledger.runs.map((run) => `${run.decided_on}:${run.candidate_digest_sha256}`);
  if (new Set(inputs).size !== inputs.length) {
    context.addIssue({
      code: "custom",
      message: "Decision runs cannot repeat the same date and candidate digest",
      path: ["runs"],
    });
  }
  for (let index = 1; index < ledger.runs.length; index += 1) {
    const previous = ledger.runs[index - 1];
    const current = ledger.runs[index];
    if (
      previous !== undefined
      && current !== undefined
      && previous.decided_on < current.decided_on
    ) {
      context.addIssue({
        code: "custom",
        message: "Decision runs must be reverse chronological",
        path: ["runs", index],
      });
    }
  }
});

export type AutomatedPublicationDecision = z.infer<typeof AutomatedPublicationDecisionSchema>;
export type AutomatedPublicationPolicy = z.infer<typeof AutomatedPublicationPolicySchema>;
export type AutomatedPublicationRun = z.infer<typeof AutomatedPublicationRunSchema>;
export type AutomatedDecision = z.infer<typeof AutomatedDecisionSchema>;
export type AutomatedDecisionRun = z.infer<typeof AutomatedDecisionRunSchema>;
