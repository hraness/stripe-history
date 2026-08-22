import { type TimelineCategoryId } from "./history-schema";

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
