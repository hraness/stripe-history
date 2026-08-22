import { MARKDOWN_CONTENT_TYPE } from "@/lib/accept";
import { loadHistory } from "@/lib/content";
import {
  markdownRewritePath,
  publicPathFromMarkdownRewrite,
} from "@/lib/history-urls";
import { markdownForPath, markdownHeaders } from "@/lib/page-markdown";

export const dynamic = "force-static";
export const dynamicParams = true;

function pathnameFromSegments(path: readonly string[] | undefined): string {
  return path === undefined || path.length === 0 ? "/" : `/${path.join("/")}`;
}

export async function generateStaticParams() {
  const history = await loadHistory();
  const publicPaths = [
    "/",
    "/about",
    "/contact",
    "/data",
    "/history",
    "/privacy",
    "/history/payment-volume",
    "/history/valuation",
    ...history.categories.map(({ id }) => `/history/${id}`),
  ];
  return publicPaths.map((pathname) => {
    const rewrite = markdownRewritePath(pathname);
    const publicPath = publicPathFromMarkdownRewrite(rewrite);
    const segments = publicPath === "/"
      ? []
      : publicPath === null
        ? []
        : publicPath.slice(1).split("/");
    return { path: segments };
  });
}

async function markdownResponse(path: readonly string[] | undefined): Promise<Response> {
  const document = await markdownForPath(pathnameFromSegments(path));
  return new Response(document.body, {
    headers: markdownHeaders(),
    status: document.status,
  });
}

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ path?: string[] }> }>,
) {
  const { path } = await context.params;
  return markdownResponse(path);
}

export async function HEAD(
  _request: Request,
  context: Readonly<{ params: Promise<{ path?: string[] }> }>,
) {
  const response = await markdownResponse((await context.params).path);
  return new Response(null, {
    headers: {
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      Vary: "Accept",
    },
    status: response.status,
  });
}
