import { describe, expect, test } from "bun:test";

import {
  AutomatedDecisionLedgerSchema,
  AutomatedPublicationLedgerSchema,
  AutomatedPublicationPolicySchema,
} from "./automated-publication-schema";
import { HistoryFileSchema } from "./history-schema";
import {
  AppearanceSchema,
  AppearanceFileSchema,
  ResearchCollectionsFileSchema,
  ResearchSourceCatalogSchema,
  ValuationFileSchema,
} from "./research-schema";

const valuationObservation = {
  confidence: "confirmed",
  date_precision: "day",
  effective_date: "2024-02-28",
  id: "valuation-2024-company-tender",
  mechanism: "company-tender",
  source_ids: ["source-11111111111111111111"],
  status: "company-confirmed",
  title: "Employee tender values Stripe at $65 billion",
  valuation: {
    basis: "transaction-implied",
    currency: "USD",
    display: "$65 billion",
    precision: "exact-stated",
    qualifier: "exact",
    value_usd: 65_000_000_000,
  },
} as const;

describe("public YAML schemas", () => {
  test("models the bounded automatic publication policy and provenance ledger", () => {
    const policy = {
      auto_publish_categories: ["acquisitions", "product-launches"],
      historical_proposal_prompt_versions: ["stripe-history/weekly-proposal/v0"],
      historical_review_prompt_versions: [],
      max_candidates_per_run: 3,
      max_publications_per_run: 2,
      max_source_characters: 40_000,
      model: "openai/gpt-5.6-sol",
      proposal_prompt_version: "stripe-history/weekly-proposal/v1",
      reasoning_effort: "max",
      review_prompt_version: "stripe-history/weekly-review/v1",
      schema: "stripe-history/automated-publication-policy/v1",
      trusted_monitors: ["stripe-newsroom", "techcrunch-stripe"],
    } as const;
    expect(AutomatedPublicationPolicySchema.safeParse(policy).success).toBe(true);
    expect(AutomatedPublicationPolicySchema.safeParse({
      ...policy,
      auto_publish_categories: ["side-quests"],
    }).success).toBe(false);
    expect(AutomatedPublicationPolicySchema.safeParse({
      ...policy,
      trusted_monitors: ["stripe-newsroom", "stripe-newsroom"],
    }).success).toBe(false);
    expect(AutomatedPublicationPolicySchema.safeParse({
      ...policy,
      model: "openai/gpt-5-mini",
    }).success).toBe(false);
    expect(AutomatedPublicationPolicySchema.safeParse({
      ...policy,
      historical_proposal_prompt_versions: [policy.proposal_prompt_version],
    }).success).toBe(false);
    expect(AutomatedPublicationLedgerSchema.safeParse({
      runs: [],
      schema: "stripe-history/automated-publications/v1",
    }).success).toBe(true);
    expect(AutomatedDecisionLedgerSchema.safeParse({
      runs: [],
      schema: "stripe-history/automated-decisions/v1",
    }).success).toBe(true);
    expect(AutomatedDecisionLedgerSchema.safeParse({
      runs: [{
        candidate_digest_sha256: "a".repeat(64),
        decided_on: "2026-08-17",
        decisions: [{
          basis: "review",
          candidate_url: "https://example.com/report",
          category: "acquisitions",
          event_id: "example-event",
          outcome: "published-new-event",
          proposal_sha256: "b".repeat(64),
          reason: "Published after independent review.",
          title: "Example report",
        }],
        id: `decision-run-${"c".repeat(20)}`,
        model: "openai/gpt-5.6-sol",
        proposal_prompt_version: "stripe-history/weekly-proposal/v1",
        reasoning_effort: "max",
        review_prompt_version: "stripe-history/weekly-review/v1",
      }],
      schema: "stripe-history/automated-decisions/v1",
    }).success).toBe(false);
  });

  test("rejects history precision that disagrees with the date", () => {
    const result = HistoryFileSchema.safeParse({
      category: {
        description: "Verified acquisition events.",
        id: "acquisitions",
        label: "acquisitions",
        order: 3,
      },
      events: [{
        confidence: "confirmed",
        date: "2026-08",
        date_precision: "day",
        id: "example-event",
        source_ids: ["source-11111111111111111111"],
        summary: "Stripe announced an event with enough concrete context to satisfy the public history contract.",
        title: "Stripe announces an example event",
      }],
      schema: "stripe-history/history/v2",
    });
    expect(result.success).toBeFalse();
  });

  test("rejects impossible calendar dates", () => {
    const result = HistoryFileSchema.safeParse({
      category: {
        description: "Verified acquisition events.",
        id: "acquisitions",
        label: "acquisitions",
        order: 3,
      },
      events: [{
        confidence: "confirmed",
        date: "2026-02-31",
        date_precision: "day",
        id: "impossible-event",
        source_ids: ["source-11111111111111111111"],
        summary: "Stripe announced an event with enough concrete context to satisfy the public history contract.",
        title: "Stripe announces an impossible event",
      }],
      schema: "stripe-history/history/v2",
    });
    expect(result.success).toBeFalse();
  });

  test("requires annual volume to be sourced, tagged, positive, and historical", () => {
    const event = {
      annual_volume: {
        calendar_year: 2025,
        display: "$1.9 trillion",
        kind: "total-volume",
        qualifier: "published-value",
        value_usd: 1_900_000_000_000,
      },
      confidence: "confirmed",
      date: "2026-02-24",
      date_precision: "day",
      id: "annual-volume-example",
      source_ids: ["source-11111111111111111111"],
      summary: "Stripe disclosed an annual volume figure with enough concrete context to satisfy the public history contract.",
      tags: ["payment-volume"],
      title: "Stripe discloses annual volume",
    };
    const file = {
      category: {
        description: "Verified company milestones.",
        id: "company-milestones",
        label: "Company milestones",
        order: 11,
      },
      events: [event],
      schema: "stripe-history/history/v2",
    };

    expect(HistoryFileSchema.safeParse(file).success).toBeTrue();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{ ...event, tags: [] }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: { ...event.annual_volume, value_usd: -1 },
      }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: { ...event.annual_volume, calendar_year: 2026 },
      }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{ ...event, confidence: "reported" }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: { ...event.annual_volume, qualifier: "estimated" },
      }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: {
          ...event.annual_volume,
          display: "$640 billion",
          qualifier: "lower-bound",
          value_usd: 640_000_000_000,
        },
      }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: {
          ...event.annual_volume,
          display: "$1.9 trillion",
          value_usd: 640_000_000_000,
        },
      }],
    }).success).toBeFalse();
    expect(HistoryFileSchema.safeParse({
      ...file,
      events: [{
        ...event,
        annual_volume: { ...event.annual_volume, display: "$1.9T" },
      }],
    }).success).toBeFalse();
  });

  test("keeps valuation mechanisms explicit and their numeric display exact", () => {
    const file = {
      observations: [valuationObservation],
      schema: "stripe-history/valuations/v1",
    };

    expect(ValuationFileSchema.safeParse(file).success).toBeTrue();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        valuation: { ...valuationObservation.valuation, value_usd: 64_000_000_000 },
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        valuation: {
          ...valuationObservation.valuation,
          display: "up to $65 billion",
        },
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        mechanism: "primary-financing",
        valuation: {
          ...valuationObservation.valuation,
          basis: "common-stock-409a",
        },
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        valuation: {
          ...valuationObservation.valuation,
          display: "up to $65 billion",
          qualifier: "upper-bound",
        },
      }],
    }).success).toBeTrue();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        mechanism: "internal-409a",
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        valuation: {
          ...valuationObservation.valuation,
          basis: "market-indication",
        },
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        derivation: {
          formula: "$65 billion × one",
          inputs: [{ label: "stated value", value: "$65 billion" }],
        },
      }],
    }).success).toBeFalse();
  });

  test("requires inferred valuations to carry their reproducible derivation", () => {
    const inferred = {
      ...valuationObservation,
      derivation: {
        formula: "$74 billion × $27.73 ÷ $29",
        inputs: [
          { label: "prior valuation", value: "$74 billion" },
          { label: "prior share price", value: "$29" },
          { label: "new share price", value: "$27.73" },
        ],
      },
      id: "valuation-2022-inferred-409a",
      mechanism: "internal-409a",
      valuation: {
        ...valuationObservation.valuation,
        basis: "common-stock-409a",
        display: "~$70.8 billion",
        precision: "inferred",
        qualifier: "approximate",
        value_usd: 70_800_000_000,
      },
    };
    expect(ValuationFileSchema.safeParse({
      observations: [inferred],
      schema: "stripe-history/valuations/v1",
    }).success).toBeTrue();
    expect(ValuationFileSchema.safeParse({
      observations: [{ ...inferred, derivation: undefined }],
      schema: "stripe-history/valuations/v1",
    }).success).toBeFalse();
  });

  test("preserves lower and upper bounds on transaction claims", () => {
    const bounded = {
      ...valuationObservation,
      capital_transacted: {
        currency: "USD",
        display: "up to $861 million",
        qualifier: "upper-bound",
        value_usd: 861_000_000,
      },
      share_price: {
        currency: "USD",
        display: "$27.51",
        qualifier: "exact",
        value_usd: 27.51,
      },
    } as const;
    const file = {
      observations: [bounded],
      schema: "stripe-history/valuations/v1",
    } as const;

    expect(ValuationFileSchema.safeParse(file).success).toBeTrue();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...bounded,
        capital_transacted: {
          ...bounded.capital_transacted,
          qualifier: "exact",
        },
      }],
    }).success).toBeFalse();
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...bounded,
        share_price: { ...bounded.share_price, value_usd: 27.5 },
      }],
    }).success).toBeFalse();
  });

  test("stages financing amounts without turning reports or agreements into raised capital", () => {
    const completedFinancing = {
      ...valuationObservation,
      financing_amount: {
        currency: "USD",
        display: "more than $80 million",
        qualifier: "lower-bound",
        stage: "completed",
        value_usd: 80_000_000,
      },
      id: "valuation-2014-series-c",
      mechanism: "primary-financing",
      status: "completed",
      title: "Series C financing values Stripe at about $1.75 billion",
      valuation: {
        ...valuationObservation.valuation,
        basis: "post-money",
        display: "~$1.75 billion",
        precision: "approximate-stated",
        qualifier: "approximate",
        value_usd: 1_750_000_000,
      },
    } as const;
    const file = {
      observations: [completedFinancing],
      schema: "stripe-history/valuations/v1",
    } as const;

    expect(ValuationFileSchema.safeParse(file).success).toBe(true);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...completedFinancing,
        financing_amount: {
          ...completedFinancing.financing_amount,
          stage: "agreements-signed",
        },
        status: "agreements-signed",
      }],
    }).success).toBe(true);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...completedFinancing,
        financing_amount: {
          ...completedFinancing.financing_amount,
          display: "$18 million",
          qualifier: "exact",
          stage: "reported-terms",
          value_usd: 18_000_000,
        },
        status: "reported",
      }],
    }).success).toBe(true);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...completedFinancing,
        financing_amount: {
          ...completedFinancing.financing_amount,
          stage: "reported-terms",
        },
      }],
    }).success).toBe(false);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...completedFinancing,
        financing_amount: {
          ...completedFinancing.financing_amount,
          qualifier: "exact",
        },
      }],
    }).success).toBe(false);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...completedFinancing,
        financing_amount: {
          currency: "USD",
          display: "more than $80 million",
          qualifier: "lower-bound",
          value_usd: 80_000_000,
        },
      }],
    }).success).toBe(false);
    expect(ValuationFileSchema.safeParse({
      ...file,
      observations: [{
        ...valuationObservation,
        financing_amount: completedFinancing.financing_amount,
      }],
    }).success).toBe(false);
  });

  test("orders reviewed leadership appearances by occurrence, not publication", () => {
    const appearance = (id: string, occurredAt: string, publishedAt: string) => ({
      date_precision: "day",
      historical_periods: ["stripe-2009-2024"],
      id,
      media: ["transcript"],
      occurred_at: occurredAt,
      participants: [{ name: "Patrick Collison", role: "interviewee" }],
      published_at: publishedAt,
      review_status: "reviewed",
      significance: "A first-person account with enough historical detail to support reviewed Stripe history claims.",
      source_ids: ["source-11111111111111111111"],
      title: "A reviewed Patrick Collison interview",
      topics: ["founding"],
      transcript: {
        availability: "official",
        language: "en",
        source_id: "source-11111111111111111111",
      },
      venue: "Example venue",
    });
    const recentOccurrence = appearance(
      "appearance-2024-patrick-example",
      "2024-01-02",
      "2024-01-03",
    );
    const olderOccurrence = appearance(
      "appearance-2023-patrick-example",
      "2023-12-30",
      "2025-01-01",
    );

    expect(AppearanceFileSchema.safeParse({
      appearances: [recentOccurrence, olderOccurrence],
      schema: "stripe-history/appearances/v1",
    }).success).toBeTrue();
    expect(AppearanceFileSchema.safeParse({
      appearances: [olderOccurrence, recentOccurrence],
      schema: "stripe-history/appearances/v1",
    }).success).toBeFalse();
    expect(AppearanceFileSchema.safeParse({
      appearances: [{
        ...recentOccurrence,
        media: ["video"],
        transcript: { availability: "none" },
      }],
      schema: "stripe-history/appearances/v1",
    }).success).toBeTrue();
    expect(AppearanceFileSchema.safeParse({
      appearances: [{
        ...recentOccurrence,
        media: ["video"],
        transcript: {
          availability: "none",
          source_id: "source-11111111111111111111",
        },
      }],
      schema: "stripe-history/appearances/v1",
    }).success).toBeFalse();
    expect(AppearanceFileSchema.safeParse({
      appearances: [{
        ...recentOccurrence,
        transcript: { availability: "official" },
      }],
      schema: "stripe-history/appearances/v1",
    }).success).toBeFalse();
    expect(AppearanceFileSchema.safeParse({
      appearances: [{
        ...recentOccurrence,
        published_at: "2024-01-01",
      }],
      schema: "stripe-history/appearances/v1",
    }).success).toBeFalse();
  });

  test("requires appearance duration precision instead of presenting rounded runtimes as exact", () => {
    const base = {
      date_precision: "day",
      historical_periods: [],
      id: "appearance-2020-01-duration",
      media: ["podcast"],
      occurred_at: "2020-01-01",
      participants: [{ name: "John Collison", role: "interviewee" }],
      review_status: "reviewed",
      significance: "A reviewed appearance with enough context to exercise the duration precision law.",
      source_ids: ["source-00000000000000000000"],
      title: "Duration fixture",
      topics: ["company-building"],
      transcript: { availability: "none" },
      venue: "Fixture",
    } as const;

    expect(AppearanceSchema.safeParse({ ...base, duration_seconds: 3_600 }).success)
      .toBe(false);
    expect(AppearanceSchema.safeParse({
      ...base,
      duration_precision: "approximate",
      duration_seconds: 3_600,
    }).success).toBe(true);
  });

  test("enforces stable IDs and canonical source uniqueness at the runtime boundary", () => {
    const source = {
      id: "source-bd6516ac551f19c37d33",
      kind: "primary",
      media_type: "article",
      published_at: "2026-02-24",
      publisher: "Stripe",
      title: "Stripe publishes its 2025 annual update",
      url: "https://stripe.com/newsroom/news/stripe-2025-update",
    } as const;
    const catalog = { schema: "stripe-history/sources/v1", sources: [source] } as const;

    expect(ResearchSourceCatalogSchema.safeParse(catalog).success).toBe(true);
    expect(ResearchSourceCatalogSchema.safeParse({
      ...catalog,
      sources: [{ ...source, id: "source-00000000000000000000" }],
    }).success).toBe(false);
    expect(ResearchSourceCatalogSchema.safeParse({
      ...catalog,
      sources: [
        source,
        {
          ...source,
          id: "source-62cce6f2a65fee599ca3",
          url: "https://www.stripe.com/us/newsroom/news/stripe-2025-update",
        },
      ].toSorted((left, right) => left.id.localeCompare(right.id)),
    }).success).toBe(false);
  });

  test("requires an explicit coverage contract for history collection outputs", () => {
    const historyCollection = {
      authority_order: ["primary"],
      capture_policy: "primary-and-claim-critical",
      coverage: {
        basis: "event-date",
        from: "2019-01-01",
        through: "2026-08-13",
      },
      dataset: "history-events",
      dedupe_keys: ["canonical-url-published-at", "event-id"],
      discovery_sources: ["https://example.com/history"],
      history_output_coverage: "complete-output",
      id: "founder-side-projects",
      input_source_ids: ["source-11111111111111111111"],
      output_files: ["history/side-quests.yml"],
      query_families: ["founder projects outside company"],
      refresh: {
        cadence: "monthly",
        lookback_days: 45,
        minimum_request_interval_ms: 1_000,
        mode: "incremental-discovery",
      },
      scope: "Reviewed founder projects outside the company.",
      supporting_source_ids: [],
    } as const;
    const file = {
      collections: [historyCollection],
      mutable_sources: [],
      schema: "stripe-history/research-collections/v1",
    } as const;

    expect(ResearchCollectionsFileSchema.safeParse(file).success).toBe(true);
    const missingCoverage: Record<string, unknown> = { ...historyCollection };
    delete missingCoverage.history_output_coverage;
    expect(ResearchCollectionsFileSchema.safeParse({
      ...file,
      collections: [missingCoverage],
    }).success).toBe(false);
    expect(ResearchCollectionsFileSchema.safeParse({
      ...file,
      collections: [{
        ...historyCollection,
        dataset: "appearances",
        output_files: ["research/appearances.yml"],
      }],
    }).success).toBe(false);
  });

});
