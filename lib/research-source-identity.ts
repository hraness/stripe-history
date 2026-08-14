import { createHash } from "node:crypto";

const STRIPE_LOCALE_PREFIX = /^\/[a-z]{2}(?:-[a-z]{2})?\//iu;

export function canonicalResearchSourceUrl(value: string): string {
  const url = new URL(value);
  url.hostname = url.hostname.toLowerCase();
  url.searchParams.sort();
  if (url.hostname === "stripe.com" || url.hostname === "www.stripe.com") {
    url.hostname = "stripe.com";
    url.pathname = url.pathname.replace(STRIPE_LOCALE_PREFIX, "/");
  }
  return url.toString();
}

export function literalResearchSourceIdentity(
  url: string,
  publishedAt: string | undefined,
): string {
  return `${url}\n${publishedAt ?? ""}`;
}

export function stableResearchSourceId(
  url: string,
  publishedAt: string | undefined,
): string {
  return `source-${createHash("sha256")
    .update(literalResearchSourceIdentity(url, publishedAt))
    .digest("hex")
    .slice(0, 20)}`;
}

export function canonicalResearchSourceIdentity(
  url: string,
  publishedAt: string | undefined,
): string {
  return `${canonicalResearchSourceUrl(url)}\n${publishedAt ?? ""}`;
}
