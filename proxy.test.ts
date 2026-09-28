import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";

import { config, proxy } from "./proxy";

function request(
  pathname: string,
  accept: string,
  method = "GET",
): NextRequest {
  return new NextRequest(new URL(pathname, "https://hraness.com"), {
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
    expect(config.matcher).toContain("/");
  });

  test("rewrites markdown Accept and .md siblings to the Node corpus handler", async () => {
    const root = await proxy(request("/stripe", "text/markdown"));
    expect(root.headers.get("vary")).toBe("Accept");
    expect(root.headers.get("x-middleware-rewrite")).toContain("/stripe/x-markdown");
    expect(root.headers.get("x-middleware-rewrite")).not.toContain("/stripe/x-markdown/");

    const about = await proxy(request("/stripe/about", "text/markdown"));
    expect(about.headers.get("x-middleware-rewrite")).toContain("/stripe/x-markdown/about");

    const sibling = await proxy(request("/stripe/about.md", "text/html"));
    expect(sibling.headers.get("x-middleware-rewrite")).toContain("/stripe/x-markdown/about");

    const category = await proxy(request("/stripe/history/acquisitions.md", "text/html"));
    expect(category.headers.get("x-middleware-rewrite")).toContain(
      "/stripe/x-markdown/history/acquisitions",
    );
  });

  test("answers unknown Markdown paths with a Markdown 404 instead of rendering on demand", async () => {
    for (const [path, accept] of [
      ["/stripe/this-does-not-exist", "text/markdown"],
      ["/stripe/history/nope", "text/markdown"],
      ["/stripe/foo.md", "text/html"],
      ["/stripe/x-markdown/foo", "text/html"],
      ["/stripe/x-markdown/history/nope", "*/*"],
    ] as const) {
      for (const method of ["GET", "HEAD"] as const) {
        const response = await proxy(request(path, accept, method));
        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
        expect(response.headers.get("vary")).toBe("Accept");
        expect(response.headers.get("x-middleware-rewrite")).toBeNull();
        const body = await response.text();
        if (method === "GET") expect(body).toContain("# Page not found");
        else expect(body).toBe("");
      }
    }

    const known = await proxy(request("/stripe/x-markdown/about", "text/html"));
    expect(known.status).toBe(200);
    expect(known.headers.get("content-type")).toBeNull();
  });

  test("returns 406 without inventing an API when no produced type is accepted", async () => {
    const response = await proxy(request("/stripe", "application/pdf"));
    expect(response.status).toBe(406);
    expect(await response.text()).toContain("text/html, text/markdown");
  });
});
