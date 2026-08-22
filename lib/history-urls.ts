import { timelineCategoryIds, type TimelineCategoryId } from "./history-schema";

export const MARKDOWN_REWRITE_PREFIX = "/x-markdown" as const;
export const HOME_MARKDOWN_RECENT_EVENT_LIMIT = 12;
export const HISTORY_EVENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export type HistoryCategoryPath = `/history/${TimelineCategoryId}`;
export type HistoryEventPath = `/history/${TimelineCategoryId}/${string}`;

export function historyCategoryPath(
  categoryId: TimelineCategoryId,
): HistoryCategoryPath {
  return `/history/${categoryId}`;
}

export function historyEventPath(
  categoryId: TimelineCategoryId,
  eventId: string,
): HistoryEventPath {
  return `/history/${categoryId}/${eventId}`;
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

export function parseHistoryEventPath(pathname: string): {
  readonly categoryId: TimelineCategoryId;
  readonly eventId: string;
} | null {
  const match = /^\/history\/([^/]+)\/([^/]+)$/u.exec(pathname);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  if (!timelineCategoryIds.includes(match[1] as TimelineCategoryId)) {
    return null;
  }
  if (!HISTORY_EVENT_ID_PATTERN.test(match[2])) return null;
  return {
    categoryId: match[1] as TimelineCategoryId,
    eventId: match[2],
  };
}
