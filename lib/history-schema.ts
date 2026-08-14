import { z } from "zod";

export const STRIPE_GUIDE_HISTORY_SCHEMA_VERSION =
  "stripe-guide/history/v1" as const;

export const historyCategoryIds = [
  "origins-and-early-company",
  "executives-and-team",
  "acquisitions",
  "product-launches",
  "country-expansion",
  "payment-and-payout-expansion",
  "fundraising",
  "headquarters-and-offices",
  "publishing",
  "side-quests",
  "company-milestones",
] as const;

export type HistoryCategoryId = (typeof historyCategoryIds)[number];

function isRealPartialDate(value: string): boolean {
  const match = /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/u.exec(value);
  if (match === null) return false;
  if (match[2] === undefined || match[3] === undefined) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const partialDateSchema = z.string().refine(
  isRealPartialDate,
  "Date must be a real calendar date using YYYY, YYYY-MM, or YYYY-MM-DD",
);

const httpsUrlSchema = z.string().max(2_048).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}, "Source URL must use HTTPS without embedded credentials");

const compactTextSchema = z.string().trim().min(1).max(500).refine(
  (value) => !/[\r\n]/u.test(value),
  "Text must fit on one line",
);

function annualVolumeDisplayValue(
  display: string,
): Readonly<{ lowerBound: boolean; valueUsd: number }> | null {
  const match = /^\$(\d+(?:\.\d+)?) (billion|trillion)(\+)?$/u.exec(display);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  const [whole = "0", fraction = ""] = match[1].split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const decimal = BigInt(`${whole}${fraction}`);
  const multiplier = match[2] === "billion" ? 1_000_000_000n : 1_000_000_000_000n;
  const numerator = decimal * multiplier;
  if (numerator % denominator !== 0n) return null;
  const value = numerator / denominator;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return {
    lowerBound: match[3] === "+",
    valueUsd: Number(value),
  };
}

export const HistorySourceSchema = z.strictObject({
  kind: z.enum(["primary", "filing", "reporting", "interview", "archive"]),
  publisher: compactTextSchema.max(120),
  published_at: partialDateSchema.optional(),
  title: compactTextSchema,
  url: httpsUrlSchema,
});

export const HistoryEventSchema = z.strictObject({
  amount: z.strictObject({
    currency: z.string().regex(/^[A-Z]{3}$/u).optional(),
    display: compactTextSchema.max(120),
    value: z.number().finite().nonnegative().optional(),
  }).optional(),
  annual_volume: z.strictObject({
    calendar_year: z.number().int().min(2000).max(2100),
    display: compactTextSchema.max(80),
    kind: z.enum(["payment-volume", "total-volume"]),
    qualifier: z.enum(["lower-bound", "published-value"]),
    value_usd: z.number().int().safe().positive(),
  }).optional(),
  confidence: z.enum(["confirmed", "reported", "disputed"]),
  date: partialDateSchema,
  date_precision: z.enum(["day", "month", "year"]),
  details: z.array(z.strictObject({
    label: compactTextSchema.max(80),
    value: compactTextSchema,
  })).max(16).optional(),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120),
  locations: z.array(compactTextSchema.max(120)).max(16).optional(),
  metrics: z.array(z.strictObject({
    context: compactTextSchema.optional(),
    label: compactTextSchema.max(100),
    value: compactTextSchema.max(120),
  })).max(16).optional(),
  organizations: z.array(compactTextSchema.max(120)).max(20).optional(),
  people: z.array(compactTextSchema.max(120)).max(30).optional(),
  related_events: z.array(
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120),
  ).max(20).optional(),
  sources: z.array(HistorySourceSchema).min(1).max(12),
  status: compactTextSchema.max(80).optional(),
  summary: z.string().trim().min(30).max(900).refine(
    (value) => !/[\r\n]/u.test(value),
    "Summary must be one paragraph",
  ),
  tags: z.array(
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(60),
  ).max(12).optional(),
  title: compactTextSchema.max(180),
}).superRefine((event, context) => {
  const expectedPrecision = event.date.length === 4
    ? "year"
    : event.date.length === 7
      ? "month"
      : "day";
  if (event.date_precision !== expectedPrecision) {
    context.addIssue({
      code: "custom",
      message: `date_precision must be ${expectedPrecision} for ${event.date}`,
      path: ["date_precision"],
    });
  }
  for (const field of [
    "people",
    "organizations",
    "locations",
    "related_events",
    "tags",
  ] as const) {
    const values = event[field];
    if (values !== undefined && new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: `${field} values must be unique`,
        path: [field],
      });
    }
  }
  if (event.related_events?.includes(event.id) === true) {
    context.addIssue({
      code: "custom",
      message: "related_events cannot reference the event itself",
      path: ["related_events"],
    });
  }
  if (event.annual_volume !== undefined) {
    const display = annualVolumeDisplayValue(event.annual_volume.display);
    if (display === null) {
      context.addIssue({
        code: "custom",
        message: "annual_volume display must be a USD billion or trillion value",
        path: ["annual_volume", "display"],
      });
    } else {
      if (display.valueUsd !== event.annual_volume.value_usd) {
        context.addIssue({
          code: "custom",
          message: "annual_volume display must equal value_usd",
          path: ["annual_volume", "display"],
        });
      }
      const expectsLowerBound = event.annual_volume.qualifier === "lower-bound";
      if (display.lowerBound !== expectsLowerBound) {
        context.addIssue({
          code: "custom",
          message: "annual_volume display + must agree with qualifier",
          path: ["annual_volume", "qualifier"],
        });
      }
    }
    if (event.confidence !== "confirmed") {
      context.addIssue({
        code: "custom",
        message: "annual_volume requires a confirmed event",
        path: ["confidence"],
      });
    }
    if (!event.sources.some(({ kind }) => kind === "primary")) {
      context.addIssue({
        code: "custom",
        message: "annual_volume requires at least one primary source",
        path: ["sources"],
      });
    }
    if (event.tags?.includes("payment-volume") !== true) {
      context.addIssue({
        code: "custom",
        message: "annual_volume requires the payment-volume tag",
        path: ["tags"],
      });
    }
    if (event.annual_volume.calendar_year >= Number(event.date.slice(0, 4))) {
      context.addIssue({
        code: "custom",
        message: "annual_volume must describe a completed prior calendar year",
        path: ["annual_volume", "calendar_year"],
      });
    }
  }
  for (const [field, values] of [
    ["details", event.details?.map(({ label }) => label)],
    ["metrics", event.metrics?.map(({ label }) => label)],
    ["sources", event.sources.map(({ url }) => url)],
  ] as const) {
    if (values !== undefined && new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: `${field} must not contain duplicate keys`,
        path: [field],
      });
    }
  }
});

export const HistoryFileSchema = z.strictObject({
  category: z.strictObject({
    description: compactTextSchema,
    id: z.enum(historyCategoryIds),
    label: compactTextSchema.max(80),
    order: z.number().int().min(1).max(100),
  }),
  events: z.array(HistoryEventSchema).min(1).max(300),
  schema: z.literal(STRIPE_GUIDE_HISTORY_SCHEMA_VERSION),
}).superRefine((file, context) => {
  const ids = file.events.map((event) => event.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Event IDs must be unique" });
  }

  for (let index = 1; index < file.events.length; index += 1) {
    const previous = file.events[index - 1];
    const current = file.events[index];
    if (previous !== undefined && current !== undefined && previous.date < current.date) {
      context.addIssue({
        code: "custom",
        message: "Events must be reverse chronological",
        path: ["events", index, "date"],
      });
    }
  }
});

export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type HistoryFile = z.infer<typeof HistoryFileSchema>;
