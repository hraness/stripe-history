import { MARKDOWN_CONTENT_TYPE } from "@/lib/accept";
import {
  MARKDOWN_PAGE_PATHS,
  markdownRewritePath,
  publicPathFromMarkdownRewrite,
} from "@/lib/history-urls";
import { markdownForPath, markdownHeaders } from "@/lib/page-markdown";

export const dynamic = "force-static";
// Every Markdown page is prerendered. Unknown paths never render on demand;
// the proxy answers them with a Markdown 404.
export const dynamicParams = false;

function pathnameFromSegments(path: readonly string[] | undefined): string {
  return path === undefined || path.length === 0 ? "/" : `/${path.join("/")}`;
}

export function generateStaticParams() {
  return MARKDOWN_PAGE_PATHS.map((pathname) => {
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
