import { describe, expect, test } from "bun:test";

import { GET } from "./route";

describe("legacy history index route", () => {
  test("permanently redirects to the canonical root timeline", () => {
    const response = GET();

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://hraness.com/stripe");
  });
});
