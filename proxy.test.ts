import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

function request(
  pathname: string,
  accept: string,
  method = "GET",
): NextRequest {
  return new NextRequest(new URL(pathname, "https://stripedex.com"), {
    headers: { accept },
    method,
  });
}

describe("Accept negotiation proxy", () => {
  test("stays filesystem-free so Vercel can run it without the YAML corpus", async () => {
    const source = await readFile(new URL("./proxy.ts", import.meta.url), "utf8");
    expect(source).not.toContain("markdownForPath");
    expect(source).not.toContain("loadHistory");
    expect(source).not.toContain("node:fs");
    expect(source).not.toContain("@/lib/content");
    expect(source).not.toContain("@/lib/page-markdown");
  });

  test("rewrites markdown Accept and .md siblings to the Node corpus handler", async () => {
    const root = await proxy(request("/", "text/markdown"));
    expect(root.headers.get("vary")).toBe("Accept");
    expect(root.headers.get("x-middleware-rewrite")).toContain("/x-markdown");
    expect(root.headers.get("x-middleware-rewrite")).not.toContain("/x-markdown/");

    const about = await proxy(request("/about", "text/markdown"));
    expect(about.headers.get("x-middleware-rewrite")).toContain("/x-markdown/about");

    const sibling = await proxy(request("/about.md", "text/html"));
    expect(sibling.headers.get("x-middleware-rewrite")).toContain("/x-markdown/about");

    const missing = await proxy(request("/this-does-not-exist", "text/markdown"));
    expect(missing.headers.get("x-middleware-rewrite")).toContain(
      "/x-markdown/this-does-not-exist",
    );
  });

  test("returns 406 without inventing an API when no produced type is accepted", async () => {
    const response = await proxy(request("/", "application/pdf"));
    expect(response.status).toBe(406);
    expect(await response.text()).toContain("text/html, text/markdown");
  });
});
