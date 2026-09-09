import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const previewAcceptTypes = ["text/html", "text/markdown", "application/pdf"] as const;
type AcceptType = typeof previewAcceptTypes[number];
type ResponseObservation = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;

/** Observe the real HTTP response; never substitute a direct proxy invocation. */
export function verifyPreviewRepresentation(accept: AcceptType, response: ResponseObservation) {
  const contentType = response.headers["content-type"] ?? "";
  const vary = (response.headers.vary ?? "").split(",").map((token) => token.trim().toLowerCase());
  assert.ok(vary.includes("accept"), `${accept} response must vary on Accept`);
  assert.ok(Buffer.byteLength(response.body) < 16 * 1024 * 1024, "Representation body exceeds the evidence bound");
  if (accept === "application/pdf") {
    assert.equal(response.status, 406);
    assert.match(contentType, /^text\/plain(?:;|$)/iu);
    assert.equal(response.body, "Not Acceptable\n\nAvailable: text/html, text/markdown\n");
  } else {
    assert.equal(response.status, 200);
    assert.equal(contentType.split(";")[0]?.trim().toLowerCase(), accept);
    if (accept === "text/html") {
      assert.ok(response.body.includes('id="history-heading"'), "HTML must contain the real timeline heading");
      assert.ok(response.body.includes('href="https://hraness.com/stripe"'), "HTML must retain the canonical mounted identity");
    } else {
      assert.ok(/^# Stripe Company History: \d+ Sourced Events$/mu.test(response.body), "Markdown must come from the real history index");
      assert.ok(response.body.includes("## Evidence status"), "Markdown must retain evidence provenance");
    }
  }
  return {
    accept, status: response.status, contentType, vary,
    bytes: Buffer.byteLength(response.body),
    bodySha256: createHash("sha256").update(response.body).digest("hex"),
  };
}
