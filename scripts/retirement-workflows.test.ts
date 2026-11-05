import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const activeDirectory = fileURLToPath(new URL("../.github/workflows/", import.meta.url));
const retiredDirectory = new URL("../.github/retired-workflows/", import.meta.url);
const retiredWorkflows = {
  "appearance-backfill.yml": "29ae2d515423b66fd07e8bceec227fe858d7cfdaae98bb48b6d23a772c0b7aa7",
  "site-production.yml": "ee7d380e540fcc667899042e16c8ca74ec0628a2c4846a25251b13b6f329d3f9",
  "weekly-news.yml": "1ea1d0ea014ddd3797de09514a7f462bf74123697b10869c30d9ee0a72074db1",
};

test("preserves the retired research and production workflows byte for byte", () => {
  for (const [name, hash] of Object.entries(retiredWorkflows)) {
    const bytes = readFileSync(new URL(name, retiredDirectory));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
  }
});

test("active workflows cannot run retired research publication or production monitoring", () => {
  const active = readdirSync(activeDirectory).filter(name => /\.ya?ml$/.test(name));
  expect(active).toContain("ci.yml");
  for (const name of Object.keys(retiredWorkflows)) expect(active).not.toContain(name);

  for (const name of active) {
    const workflow = readFileSync(new URL(name, new URL("../.github/workflows/", import.meta.url)), "utf8");
    expect(workflow).not.toMatch(/history:(?:news:pull|publish:auto|appearances:summarize)/);
    expect(workflow).not.toContain("deliver-weekly-history.ts");
    expect(workflow).not.toMatch(/verify-site-browser\.mjs\s+--production/);
    expect(workflow).not.toContain("retired-workflows/");
  }
});
