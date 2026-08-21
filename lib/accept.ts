export const PRODUCED_MEDIA_TYPES = ["text/html", "text/markdown"] as const;

export type ProducedMediaType = (typeof PRODUCED_MEDIA_TYPES)[number];

interface AcceptEntry {
  readonly type: string;
  readonly q: number;
  readonly specificity: number;
}

function parseAccept(header: string): readonly AcceptEntry[] {
  return header.split(",").flatMap((raw) => {
    const parts = raw.trim().split(";").map((part) => part.trim());
    const type = parts[0]?.toLowerCase();
    if (type === undefined || type === "") return [];
    let q = 1;
    for (const param of parts.slice(1)) {
      const [name, value] = param.split("=").map((part) => part.trim());
      if (name !== "q" || value === undefined) continue;
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
    }
    return [{
      q,
      specificity: type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2,
      type,
    }];
  });
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1));
  return entry.type === candidate;
}

export function preferredType(header: string | null): ProducedMediaType | null {
  if (header === null || header.trim() === "") return PRODUCED_MEDIA_TYPES[0];
  const entries = parseAccept(header);
  if (entries.length === 0) return PRODUCED_MEDIA_TYPES[0];

  let bestType: ProducedMediaType | null = null;
  let bestQ = -1;
  let bestPosition = Number.POSITIVE_INFINITY;

  for (const candidate of PRODUCED_MEDIA_TYPES) {
    let matched: AcceptEntry | null = null;
    let matchedPosition = Number.POSITIVE_INFINITY;
    for (const [idx, entry] of entries.entries()) {
      if (!matches(entry, candidate)) continue;
      if (
        matched === null
        || entry.specificity > matched.specificity
        || (entry.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = entry;
        matchedPosition = idx;
      }
    }
    if (matched === null || matched.q <= 0) continue;
    if (matched.q > bestQ || (matched.q === bestQ && matchedPosition < bestPosition)) {
      bestQ = matched.q;
      bestPosition = matchedPosition;
      bestType = candidate;
    }
  }

  return bestType;
}

export function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  if (existing === null || existing.trim() === "") {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("Vary", `${existing}, Accept`);
  }
}

export function isNextRscRequest(headers: Headers): boolean {
  return headers.has("rsc") || headers.has("next-router-state-tree");
}

export function markdownSiblingPath(pathname: string): string | null {
  if (!pathname.endsWith(".md")) return null;
  const withoutSuffix = pathname.slice(0, -3);
  return withoutSuffix === "" ? "/" : withoutSuffix;
}

const SKIP_NEGOTIATION_PREFIXES = [
  "/_next/",
  "/_vercel/",
  "/research/",
] as const;

const SKIP_NEGOTIATION_PATHS = new Set([
  "/favicon.ico",
  "/llms.txt",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
]);

export function shouldSkipNegotiation(pathname: string): boolean {
  if (SKIP_NEGOTIATION_PATHS.has(pathname)) return true;
  if (SKIP_NEGOTIATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (pathname.endsWith(".md")) return false;
  const lastSegment = pathname.split("/").at(-1) ?? "";
  return lastSegment.includes(".");
}

export type NegotiationDecision =
  | { readonly kind: "html" }
  | { readonly kind: "markdown"; readonly pathname: string }
  | { readonly kind: "not_acceptable" }
  | { readonly kind: "passthrough" };

export function decideRepresentation(input: Readonly<{
  accept: string | null;
  method: string;
  pathname: string;
  rsc: boolean;
}>): NegotiationDecision {
  if (input.method !== "GET" && input.method !== "HEAD") return { kind: "passthrough" };
  if (input.rsc || shouldSkipNegotiation(input.pathname)) return { kind: "passthrough" };

  const sibling = markdownSiblingPath(input.pathname);
  if (sibling !== null) return { kind: "markdown", pathname: sibling };

  const chosen = preferredType(input.accept);
  if (chosen === "text/markdown") {
    return { kind: "markdown", pathname: input.pathname };
  }
  if (chosen === null && input.accept !== null && input.accept.trim() !== "") {
    return { kind: "not_acceptable" };
  }
  return { kind: "html" };
}
