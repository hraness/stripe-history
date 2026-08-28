import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadHistory } from "./content";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

const ANNUAL_LETTER_EVENTS = [
  {
    id: "milestone-2026-2025-volume-1-9-trillion",
    sourceUrlIncludes: [
      "https://stripe.com/annual-updates/2025",
      "https://stripe.com/newsroom/news/stripe-2025-update",
      "Stripe-annual-letter-2025-desktop.pdf",
    ],
    metricValues: ["$1.9 trillion", "200 million+", "25%", "~$400 billion", "45%"],
  },
  {
    id: "milestone-2025-2024-volume-1-4-trillion",
    sourceUrlIncludes: [
      "https://stripe.com/annual-updates/2024",
      "https://stripe.com/newsroom/news/stripe-2024-update",
      "Stripe-annual-letter-2024.pdf",
    ],
    metricValues: ["$1.4 trillion", "300,000+", "~200 million", "1 in 6"],
  },
  {
    id: "milestone-2024-2023-volume-1-trillion",
    sourceUrlIncludes: [
      "/annual-updates/2023",
      "https://stripe.com/newsroom/news/stripe-2023-update",
      "Stripe_2023_annual_letter_enGB.pdf",
    ],
    metricValues: ["$1 trillion", "100+", "1 in 6", "$18.6 billion"],
  },
  {
    id: "milestone-2023-2022-volume-817-billion",
    sourceUrlIncludes: [
      "https://stripe.com/annual-updates/2022",
      "https://stripe.com/newsroom/news/stripe-2022-update",
      "stripe-2022-update.pdf",
      "stripe-2022-annual-update.pdf",
    ],
    metricValues: ["$817 billion+", "1,000+", "55%", "75%", "10 million+"],
  },
  {
    id: "milestone-2022-2021-volume-640-billion",
    sourceUrlIncludes: [
      "https://stripe.com/annual-updates/2021",
      "https://stripe.com/files/stripe-2021-update.pdf",
    ],
    metricValues: ["$640 billion+", "about 1 in 10", "50+", "60%", "7,000"],
  },
] as const;

describe("annual community letters", () => {
  test("attach official HTML and PDF sources and stated figures without inventing company revenue", async () => {
    const history = await loadHistory(join(projectDirectory, "public", "history"));
    const revenueEventIds = new Set(history.annualRevenues.map(({ eventId }) => eventId));

    for (const spec of ANNUAL_LETTER_EVENTS) {
      const event = history.events.find(({ id }) => id === spec.id);
      expect(event).toBeDefined();
      expect(event?.annual_revenue).toBeUndefined();
      expect(revenueEventIds.has(spec.id)).toBe(false);
      expect(event?.tags).toContain("annual-letter");

      const urls = event?.sources.map(({ url }) => url) ?? [];
      for (const fragment of spec.sourceUrlIncludes) {
        expect(urls.some((url) => url.includes(fragment))).toBe(true);
      }

      const values = event?.metrics?.map(({ value }) => value) ?? [];
      for (const value of spec.metricValues) {
        expect(values).toContain(value);
      }
      expect(event?.metrics?.length ?? 0).toBeLessThanOrEqual(16);
    }
  });
});
