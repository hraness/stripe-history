import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("security.txt names the advisory route and the email fallback", async () => {
  const text = await readFile(
    new URL("../public/.well-known/security.txt", import.meta.url),
    "utf8",
  );
  const contacts = [...text.matchAll(/^Contact: (.+)$/gmu)].map((m) => m[1]);
  expect(contacts).toEqual([
    "https://github.com/hraness/stripe-history/security/advisories/new",
    "mailto:hraness@pm.me",
  ]);
  expect(text).toContain(
    "Canonical: https://hraness.com/stripe/.well-known/security.txt",
  );
  const expires = /^Expires: (.+)$/mu.exec(text)?.[1];
  expect(Date.parse(expires ?? "")).toBeGreaterThan(Date.now());
});
