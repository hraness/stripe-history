import { expect, test } from "bun:test";
import { verifyPreviewRepresentation, previewAcceptTypes } from "./compiled-preview-representations";

const observations = {
  "text/html": { status: 200, headers: { "content-type": "text/html; charset=utf-8", vary: "RSC, next-router-state-tree, Accept" }, body: '<link rel="canonical" href="https://hraness.com/stripe"><h1 id="history-heading">Stripe</h1>' },
  "text/markdown": { status: 200, headers: { "content-type": "text/markdown; charset=utf-8", vary: "Accept" }, body: "# Stripe Company History: 234 Sourced Events\n\n## Evidence status\n" },
  "application/pdf": { status: 406, headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept" }, body: "Not Acceptable\n\nAvailable: text/html, text/markdown\n" },
} as const;

for (const accept of previewAcceptTypes) {
  test(`records native ${accept} representation identity without retaining body text`, () => {
    const result = verifyPreviewRepresentation(accept, observations[accept]);
    expect(result.accept).toBe(accept);
    expect(result.bodySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.bytes).toBe(Buffer.byteLength(observations[accept].body));
    expect(JSON.stringify(result)).not.toContain(observations[accept].body);
  });
  test(`rejects missing Vary, redirect and incorrect type for ${accept}`, () => {
    const response = observations[accept];
    expect(() => verifyPreviewRepresentation(accept, { ...response, headers: { ...response.headers, vary: "RSC" } })).toThrow();
    expect(() => verifyPreviewRepresentation(accept, { ...response, status: 307 })).toThrow();
    expect(() => verifyPreviewRepresentation(accept, { ...response, headers: { ...response.headers, "content-type": "application/json" } })).toThrow();
    expect(() => verifyPreviewRepresentation(accept, { ...response, body: "wrong representation" })).toThrow();
  });
}
