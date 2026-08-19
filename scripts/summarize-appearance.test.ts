import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "bun:test";

import {
  extractCaptureTranscript,
  summarizeAppearanceCapture,
  type AppearanceSummaryGenerator,
} from "./summarize-appearance";

const transcriptLines = [
  "A single engineer can do what two teams of engineers could do two years ago.",
  "We created something called Stripe minions and last week seven thousand pull requests came from minions.",
  "Our belief is to build more products because software is becoming much cheaper to create.",
  "Stablecoins can become infrastructure for moving money across a truly global economy.",
];

async function fixtureCapture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "stripe-appearance-summary-"));
  const path = join(directory, "capture.md");
  const repeated = Array.from({ length: 12 }, (_, index) =>
    `- [00:${String(index).padStart(2, "0")}] ${transcriptLines[index % transcriptLines.length]}`)
    .join("\n");
  await writeFile(path, `---\ntitle: Fixture\n---\n# Fixture\n\n## Transcript\n\n${repeated}\n`);
  return path;
}

describe("leadership appearance summaries", () => {
  test("extracts timestamp-free transcript evidence", () => {
    const transcript = extractCaptureTranscript(`\n# Example\n\n## Transcript\n\n${Array.from(
      { length: 20 },
      (_, index) => `- [00:${String(index).padStart(2, "0")}] ${transcriptLines[index % 4]}`,
    ).join("\n")}`);
    expect(transcript).toContain("A single engineer can do what two teams");
    expect(transcript).not.toContain("[00:00]");
  });

  test("produces a strong-model proposal with exact transcript evidence", async () => {
    const capturePath = await fixtureCapture();
    const generator: AppearanceSummaryGenerator = async (request) => {
      expect(request.model).toBe("openai/gpt-5.6-sol");
      expect(request.reasoningEffort).toBe("max");
      expect(request.tags).toContain("transcript-summary");
      return {
        evidence_quotes: transcriptLines.slice(0, 3),
        gist: "Will Gaybrick describes AI as a reason for Stripe to expand its product ambition, not merely reduce costs. Coding agents already contribute thousands of pull requests, while smaller teams gain more agency. He connects those operating changes to cheaper software creation, agentic commerce, and stablecoins as infrastructure for a global digital economy.",
        ideas: [{
          title: "Build more",
          detail: "Stripe treats falling software-production costs as a chance to pursue more products and customer problems rather than only optimize headcount.",
        }, {
          title: "Agent leverage is measurable",
          detail: "Internal coding agents already produce thousands of pull requests, turning AI adoption into an observable change in engineering throughput.",
        }, {
          title: "Commerce primitives will change",
          detail: "Gaybrick expects agents and stablecoins to reshape how software is purchased and how money moves across borders.",
        }],
      };
    };
    const proposal = await summarizeAppearanceCapture({
      capturePath,
      generatedAt: "2026-08-19T12:00:00.000Z",
      generator,
    });
    expect(proposal.schema).toBe("stripe-history/appearance-summary-proposal/v1");
    expect(proposal.capture_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(proposal.evidence_quotes).toEqual(transcriptLines.slice(0, 3));
    expect(proposal.digest.ideas).toHaveLength(3);
  });

  test("rejects a fluent summary whose evidence is not in the transcript", async () => {
    const capturePath = await fixtureCapture();
    await expect(summarizeAppearanceCapture({
      capturePath,
      generator: async () => ({
        evidence_quotes: [
          transcriptLines[0],
          transcriptLines[1],
          "This sentence sounds plausible but it never appeared anywhere in the captured transcript.",
        ],
        gist: "Will Gaybrick describes AI as a reason for Stripe to expand its product ambition, not merely reduce costs. Coding agents already contribute thousands of pull requests, while smaller teams gain more agency. He connects those operating changes to cheaper software creation, agentic commerce, and stablecoins as infrastructure for a global digital economy.",
        ideas: [{ title: "One", detail: "A sufficiently detailed first idea about company building and software production at Stripe." }, { title: "Two", detail: "A sufficiently detailed second idea about engineering throughput and internal coding agents." }, { title: "Three", detail: "A sufficiently detailed third idea about future digital commerce and stablecoin infrastructure." }],
      }),
    })).rejects.toThrow("not an exact transcript passage");
  });
});
