import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "yaml";

import {
  AppearanceBackfillFileSchema,
  loadAppearanceBackfill,
} from "./appearance-backfill";

describe("leadership appearance backfill", () => {
  test("accounts for every raw discovery hit without promoting candidates", async () => {
    const backfill = await loadAppearanceBackfill();

    expect(backfill.counts).toEqual({
      already_reviewed_variants: 9,
      duplicate_variants: 5,
      excluded_hits: 2,
      raw_hits: 47,
    });
    expect(backfill.candidates).toHaveLength(31);
    expect(backfill.candidates.every(({ review_status: status }) =>
      status === "source-review-needed")).toBe(true);
    expect(backfill.candidates[0]?.published_at).toBe("2026-05-21");
    expect(backfill.candidates.at(-1)?.published_at).toBe("2013-08-13");
  });

  test("rejects incomplete hit accounting", async () => {
    const value = parse(await readFile(join(
      process.cwd(),
      "public",
      "research",
      "appearance-backfill.yml",
    ), "utf8")) as Record<string, unknown>;
    const counts = value.counts as Record<string, unknown>;
    counts.raw_hits = 48;

    expect(() => AppearanceBackfillFileSchema.parse(value)).toThrow(
      "Backfill accounting covers 47 of 48 raw hits",
    );
  });
});
