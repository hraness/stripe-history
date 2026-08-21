import { NextResponse, type NextRequest } from "next/server";

import {
  appendVaryAccept,
  decideRepresentation,
  isNextRscRequest,
} from "./lib/accept";
import {
  MARKDOWN_CONTENT_TYPE,
  NOT_ACCEPTABLE_BODY,
  markdownForPath,
} from "./lib/page-markdown";

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
    const document = await markdownForPath(decision.pathname);
    return new NextResponse(document.body, {
      headers: {
        "Content-Type": MARKDOWN_CONTENT_TYPE,
        Vary: "Accept",
      },
      status: document.status,
    });
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
