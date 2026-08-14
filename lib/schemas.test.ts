import { describe, expect, test } from "bun:test";

import { HistoryFileSchema } from "./history-schema";

describe("public YAML schemas", () => {
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
        sources: [{
          kind: "primary",
          publisher: "Stripe",
          title: "Example source",
          url: "https://stripe.com/example",
        }],
        summary: "Stripe announced an event with enough concrete context to satisfy the public history contract.",
        title: "Stripe announces an example event",
      }],
      schema: "stripe-guide/history/v1",
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
        sources: [{
          kind: "primary",
          publisher: "Stripe",
          title: "Example source",
          url: "https://stripe.com/example",
        }],
        summary: "Stripe announced an event with enough concrete context to satisfy the public history contract.",
        title: "Stripe announces an impossible event",
      }],
      schema: "stripe-guide/history/v1",
    });
    expect(result.success).toBeFalse();
  });

  test("requires annual volume to be sourced, tagged, positive, and historical", () => {
    const primarySource = {
      kind: "primary",
      publisher: "Stripe",
      title: "Stripe annual update",
      url: "https://stripe.com/annual-updates/example",
    };
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
      sources: [primarySource],
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
      schema: "stripe-guide/history/v1",
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
        sources: [{ ...primarySource, kind: "reporting" }],
      }],
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

});
