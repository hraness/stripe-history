import { timelineCategoryIds, type TimelineCategoryId } from "./history-schema";

export const MARKDOWN_REWRITE_PREFIX = "/x-markdown" as const;

export type HistoryCategoryPath = `/history/${TimelineCategoryId}`;

export function historyCategoryPath(
  categoryId: TimelineCategoryId,
): HistoryCategoryPath {
  return `/history/${categoryId}`;
}

export function markdownRewritePath(pathname: string): string {
  if (pathname === "/") return MARKDOWN_REWRITE_PREFIX;
  return `${MARKDOWN_REWRITE_PREFIX}${pathname}`;
}

export function isMarkdownRewritePath(pathname: string): boolean {
  return pathname === MARKDOWN_REWRITE_PREFIX
    || pathname.startsWith(`${MARKDOWN_REWRITE_PREFIX}/`);
}

export function publicPathFromMarkdownRewrite(pathname: string): string | null {
  if (!isMarkdownRewritePath(pathname)) return null;
  const rest = pathname.slice(MARKDOWN_REWRITE_PREFIX.length);
  return rest === "" ? "/" : rest;
}

/** Public page paths that have a Markdown representation, besides /llms.txt. */
export const MARKDOWN_PAGE_PATHS: readonly string[] = [
  "/",
  "/about",
  "/contact",
  "/data",
  "/history",
  "/privacy",
  "/history/payment-volume",
  "/history/net-revenue",
  "/history/valuation",
  ...timelineCategoryIds.map(historyCategoryPath),
];

const markdownPagePaths = new Set(MARKDOWN_PAGE_PATHS);

/** True when a public path has a Markdown page. Reads no corpus files. */
export function isKnownMarkdownPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  return markdownPagePaths.has(path === "" ? "/" : path);
}
