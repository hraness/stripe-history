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
  NOT_ACCEPTABLE_BODY,
} from "./lib/accept";
import { markdownRewritePath } from "./lib/history-urls";

export async function proxy(request: NextRequest) {
  const appPath = appPathFromPublicSitePath(request.nextUrl.pathname);
  const representationPath = appPath ?? request.nextUrl.pathname;
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
