import { describe, expect, test } from "bun:test";

import { GET } from "./route";

describe("llms.txt route", () => {
  test("serves the agent index as plain text", async () => {
    const response = await GET();
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("## When to use this");
    expect(body).toContain("# Stripedex");
  });
});
