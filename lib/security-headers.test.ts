import { expect, test } from "bun:test";

import { ANALYTICS_API_HOST, ANALYTICS_REGION_URL } from "../app/analytics";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./security-headers";

test("analytics stays on the page's own origin and the policy forbids plugins", () => {
  // The /ph proxy and /api/region are same-origin paths on hraness.com.
  expect(ANALYTICS_API_HOST.startsWith("/")).toBe(true);
  expect(ANALYTICS_REGION_URL.startsWith("/")).toBe(true);
  expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self' https://account.hraness.com;");
  expect(CONTENT_SECURITY_POLICY).not.toContain("posthog.com");
  expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  expect(CONTENT_SECURITY_POLICY).not.toContain("*");
});

test("each header is sent once with a non-empty value", () => {
  const keys = SECURITY_HEADERS.map((header) => header.key);
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toEqual(expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]));
  for (const header of SECURITY_HEADERS) expect(header.value.length).toBeGreaterThan(0);
});
