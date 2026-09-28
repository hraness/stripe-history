import { NextResponse, type NextRequest } from "next/server";

import {
  appPathFromPublicSitePath,
  publicSitePath,
  type SitePath,
} from "./app/site";
import {
  appendVaryAccept,
  decideRepresentation,
  isNextRscRequest,
  MARKDOWN_CONTENT_TYPE,
  NOT_ACCEPTABLE_BODY,
} from "./lib/accept";
import {
  isKnownMarkdownPath,
  markdownRewritePath,
  publicPathFromMarkdownRewrite,
} from "./lib/history-urls";
import { notFoundMarkdown } from "./lib/not-found-markdown";

function markdownNotFound(method: string): NextResponse {
  return new NextResponse(method === "HEAD" ? null : notFoundMarkdown(), {
    headers: {
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      Vary: "Accept",
    },
    status: 404,
  });
}

export async function proxy(request: NextRequest) {
  const appPath = appPathFromPublicSitePath(request.nextUrl.pathname);
  const representationPath = appPath ?? request.nextUrl.pathname;

  // A direct request for the internal Markdown route of an unknown page.
  const directMarkdownPath = publicPathFromMarkdownRewrite(representationPath);
  if (
    directMarkdownPath !== null
    && !isKnownMarkdownPath(directMarkdownPath)
    && (request.method === "GET" || request.method === "HEAD")
  ) {
    return markdownNotFound(request.method);
  }
  const decision = decideRepresentation({
    accept: request.headers.get("accept"),
    method: request.method,
    pathname: representationPath,
    rsc: isNextRscRequest(request.headers),
  });

  if (decision.kind === "passthrough") {
    return NextResponse.next();
  }

  if (decision.kind === "not_acceptable") {
    return new NextResponse(NOT_ACCEPTABLE_BODY, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept",
      },
      status: 406,
    });
  }

  if (decision.kind === "markdown") {
    if (!isKnownMarkdownPath(decision.pathname)) return markdownNotFound(request.method);
    const url = request.nextUrl.clone();
    const rewritePath = markdownRewritePath(decision.pathname) as SitePath;
    url.pathname = appPath === null ? rewritePath : publicSitePath(rewritePath);
    const headers = new Headers(request.headers);
    headers.set("x-stripe-history-representation", "markdown");
    const response = NextResponse.rewrite(url, {
      request: { headers },
    });
    response.headers.set("Vary", "Accept");
    return response;
  }

  const response = NextResponse.next();
  appendVaryAccept(response.headers);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/|_vercel/).*)",
  ],
};
