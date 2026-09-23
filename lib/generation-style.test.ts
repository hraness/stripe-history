import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

import { PROPOSAL_SYSTEM } from "../scripts/auto-publish-history";
import { APPEARANCE_SUMMARY_SYSTEM } from "../scripts/summarize-appearance";
import { EXTRACTION_SYSTEM } from "../scripts/update-sessions-history";
import { AutomatedPublicationPolicySchema } from "./automated-publication-schema";
import {
  HRANESS_GENERATION_STYLE_V1,
  HRANESS_GENERATION_STYLE_V1_MARKDOWN_SHA256,
  HRANESS_GENERATION_STYLE_VERSION,
  hranessGenerationStyleMarkdown,
  STRIPE_HISTORY_APPEARANCE_WRITING,
  STRIPE_HISTORY_EVENT_WRITING,
} from "./generation-style";

const prompts = {
  appearance: APPEARANCE_SUMMARY_SYSTEM,
  sessions: EXTRACTION_SYSTEM,
  weekly: PROPOSAL_SYSTEM,
} as const;

describe("generation style", () => {
  test("vendors hraness-generation-style/v1 unchanged", () => {
    expect(HRANESS_GENERATION_STYLE_VERSION).toBe("hraness-generation-style/v1");
    expect(
      createHash("sha256").update(hranessGenerationStyleMarkdown()).digest("hex"),
    ).toBe(HRANESS_GENERATION_STYLE_V1_MARKDOWN_SHA256);
  });

  test("puts the shared block first in every prompt that writes published text", () => {
    for (const prompt of Object.values(prompts)) {
      expect(prompt.startsWith(HRANESS_GENERATION_STYLE_V1)).toBe(true);
    }
    expect(PROPOSAL_SYSTEM).toContain(STRIPE_HISTORY_EVENT_WRITING);
    expect(EXTRACTION_SYSTEM).toContain(STRIPE_HISTORY_EVENT_WRITING);
    expect(APPEARANCE_SUMMARY_SYSTEM).toContain(STRIPE_HISTORY_APPEARANCE_WRITING);
  });

  test("keeps the patterns the prompts forbid out of the prompts", () => {
    for (const prompt of Object.values(prompts)) {
      expect(prompt).not.toContain("—");
      expect(prompt).not.toContain("Hraness Reading list");
    }
  });

  test("keeps bookkeeping out of timeline fields", () => {
    expect(STRIPE_HISTORY_EVENT_WRITING).toContain("Keep dates, caveats, and notes out of status.");
    expect(STRIPE_HISTORY_EVENT_WRITING).toContain(
      "Never describe how the timeline records, dates, classifies, or plots the event",
    );
    expect(STRIPE_HISTORY_EVENT_WRITING).toContain("End the summary on its last sourced fact.");
  });

  test("records the generation style with the current weekly prompt version", async () => {
    const policy = AutomatedPublicationPolicySchema.parse(parse(await readFile(
      join(process.cwd(), "public", "research", "publication-policy.yml"),
      "utf8",
    )));
    expect(policy.proposal_prompt_version).toBe("stripe-history/weekly-proposal/v7");
    expect(policy.generation_style_version).toBe(HRANESS_GENERATION_STYLE_VERSION);
    expect(policy.historical_proposal_prompt_versions).toContain(
      "stripe-history/weekly-proposal/v6",
    );
  });
});
