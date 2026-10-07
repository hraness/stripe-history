import { expect, test } from "bun:test";

import { POSTHOG_API_HOST } from "../app/analytics";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./security-headers";

test("the policy allows analytics only at the configured host and forbids plugins", () => {
  expect(CONTENT_SECURITY_POLICY).toContain(`connect-src 'self' ${POSTHOG_API_HOST} https://account.hraness.com;`);
  expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  expect(CONTENT_SECURITY_POLICY).not.toContain("*");
});

test("each header is sent once with a non-empty value", () => {
  const keys = SECURITY_HEADERS.map((header) => header.key);
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toEqual(expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]));
  for (const header of SECURITY_HEADERS) expect(header.value.length).toBeGreaterThan(0);
});
