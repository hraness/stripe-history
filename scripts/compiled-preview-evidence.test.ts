import { expect, test } from "bun:test";
import { previewErrorEvidence, terminalPreviewState } from "./compiled-preview-evidence";

test("terminal completion requires both work and custody; cleanup cannot green a red run", () => {
  expect(terminalPreviewState(true, true)).toBe("complete");
  expect(terminalPreviewState(true, false)).toBe("failed");
  expect(terminalPreviewState(false, true)).toBe("failed");
  expect(terminalPreviewState(false, false)).toBe("failed");
});

test("terminal error evidence is bounded and contains no raw diagnostic payload", () => {
  const value = previewErrorEvidence("native-build", new Error("synthetic-private-value"));
  expect(value.stage).toBe("native-build");
  expect(value.name).toBe("Error");
  expect(value.diagnosticSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(JSON.stringify(value)).not.toContain("synthetic-private-value");
});
