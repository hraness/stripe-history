import { describe, expect, test } from "bun:test";

import { boundedResponseText } from "./bounded-http";

describe("bounded provider responses", () => {
  test("reads a successful response within its actual byte limit", async () => {
    await expect(boundedResponseText(new Response("hello"), {
      label: "provider",
      maxBytes: 5,
    })).resolves.toBe("hello");
  });

  test("rejects oversized streaming bodies even when Content-Length lies", async () => {
    await expect(boundedResponseText(new Response("oversized", {
      headers: { "Content-Length": "1" },
    }), {
      label: "provider",
      maxBytes: 3,
    })).rejects.toThrow("exceeded the configured byte limit");
  });

  test("rejects HTTP failures before consuming their body", async () => {
    await expect(boundedResponseText(new Response("failure", { status: 503 }), {
      label: "provider",
      maxBytes: 100,
    })).rejects.toThrow("provider returned HTTP 503");
  });

  test("can read a bounded provider error body for structured diagnostics", async () => {
    await expect(boundedResponseText(new Response("failure", { status: 403 }), {
      allowErrorStatus: true,
      label: "provider",
      maxBytes: 100,
    })).resolves.toBe("failure");
  });
});
