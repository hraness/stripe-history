import { describe, expect, test } from "bun:test";

import {
  appendVaryAccept,
  decideRepresentation,
  isNextRscRequest,
  markdownSiblingPath,
  preferredType,
  shouldSkipNegotiation,
} from "./accept";

describe("acceptmarkdown.com Accept parsing", () => {
  test("defaults to HTML when Accept is missing or empty", () => {
    expect(preferredType(null)).toBe("text/html");
    expect(preferredType("")).toBe("text/html");
    expect(preferredType("   ")).toBe("text/html");
  });

  test("honors q-values and most-specific matching ranges", () => {
    expect(preferredType("text/markdown")).toBe("text/markdown");
    expect(preferredType("text/markdown, text/html, */*")).toBe("text/markdown");
    expect(preferredType("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"))
      .toBe("text/html");
    expect(preferredType("text/html;q=0.1, text/markdown;q=0.9")).toBe("text/markdown");
    expect(preferredType("text/html;q=0, */*;q=1")).toBe("text/markdown");
    expect(preferredType("text/*;q=0.8, text/markdown;q=0.2")).toBe("text/html");
  });

  test("returns null when every produced type is rejected", () => {
    expect(preferredType("application/pdf")).toBeNull();
    expect(preferredType("text/html;q=0, text/markdown;q=0, */*;q=0")).toBeNull();
  });
});

describe("agent representation negotiation", () => {
  test("skips Next.js RSC navigations, non-GET methods, and machine files", () => {
    expect(isNextRscRequest(new Headers({ rsc: "1" }))).toBe(true);
    expect(isNextRscRequest(new Headers({ "next-router-state-tree": "%5B%5D" }))).toBe(true);
    expect(isNextRscRequest(new Headers({ accept: "text/markdown" }))).toBe(false);
    expect(shouldSkipNegotiation("/history/acquisitions.yml")).toBe(true);
    expect(shouldSkipNegotiation("/research/sources.yml")).toBe(true);
    expect(shouldSkipNegotiation("/sitemap.xml")).toBe(true);
    expect(shouldSkipNegotiation("/llms.txt")).toBe(true);
    expect(shouldSkipNegotiation("/about.md")).toBe(false);
    expect(shouldSkipNegotiation("/about")).toBe(false);
    expect(shouldSkipNegotiation("/x-markdown")).toBe(true);
    expect(shouldSkipNegotiation("/x-markdown/about")).toBe(true);
    expect(decideRepresentation({
      accept: "text/markdown",
      method: "POST",
      pathname: "/about",
      rsc: false,
    })).toEqual({ kind: "passthrough" });
    expect(decideRepresentation({
      accept: "text/markdown",
      method: "GET",
      pathname: "/about",
      rsc: true,
    })).toEqual({ kind: "passthrough" });
  });

  test("selects markdown, HTML, .md siblings, and 406 without inventing an API", () => {
    expect(markdownSiblingPath("/about.md")).toBe("/about");
    expect(markdownSiblingPath("/.md")).toBe("/");
    expect(markdownSiblingPath("/about")).toBeNull();
    expect(decideRepresentation({
      accept: "text/markdown",
      method: "GET",
      pathname: "/about",
      rsc: false,
    })).toEqual({ kind: "markdown", pathname: "/about" });
    expect(decideRepresentation({
      accept: "text/html",
      method: "GET",
      pathname: "/about.md",
      rsc: false,
    })).toEqual({ kind: "markdown", pathname: "/about" });
    expect(decideRepresentation({
      accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      method: "GET",
      pathname: "/",
      rsc: false,
    })).toEqual({ kind: "html" });
    expect(decideRepresentation({
      accept: "application/pdf",
      method: "GET",
      pathname: "/",
      rsc: false,
    })).toEqual({ kind: "not_acceptable" });
  });

  test("appends Accept to Vary without duplicating it", () => {
    const empty = new Headers();
    appendVaryAccept(empty);
    expect(empty.get("Vary")).toBe("Accept");

    const existing = new Headers({
      Vary: "rsc, next-router-state-tree",
    });
    appendVaryAccept(existing);
    expect(existing.get("Vary")).toBe("rsc, next-router-state-tree, Accept");
    appendVaryAccept(existing);
    expect(existing.get("Vary")).toBe("rsc, next-router-state-tree, Accept");
  });
});
