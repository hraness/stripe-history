import { describe, expect, test } from "bun:test";
import { NOINDEX_ROBOTS } from "@hraness/web-discovery";

import { metadata } from "./not-found";

describe("stripedex.com not-found metadata", () => {
  test("uses a distinct noindex page instead of the homepage identity", () => {
    expect(metadata).toEqual({
      title: "Page not found",
      description: "The requested Stripe history page does not exist.",
      robots: NOINDEX_ROBOTS,
    });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
  });
});
