import { NextResponse, type NextRequest } from "next/server";

import {
  appendVaryAccept,
  decideRepresentation,
  isNextRscRequest,
  NOT_ACCEPTABLE_BODY,
} from "./lib/accept";
import { markdownRewritePath } from "./lib/history-urls";

export async function proxy(request: NextRequest) {
  const decision = decideRepresentation({
    accept: request.headers.get("accept"),
    method: request.method,
    pathname: request.nextUrl.pathname,
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
    url.pathname = markdownRewritePath(decision.pathname);
    const headers = new Headers(request.headers);
    headers.set("x-stripedex-representation", "markdown");
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
    "/((?!_next/|_vercel/).*)",
  ],
};
