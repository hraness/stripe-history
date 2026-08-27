import { describe, expect, test } from "bun:test";

import {
  gatewayOptionsForCredential,
  resolveGatewayCredential,
  resolveGatewayModel,
} from "./gateway";

describe("gateway configuration", () => {
  test("prefers the project-specific credential", () => {
    expect(resolveGatewayCredential({
      AI_GATEWAY_API_KEY: "generic-gateway-credential",
      STRIPEDEX_LLM_API_KEY: "legacy-project-credential",
      STRIPE_HISTORY_LLM_API_KEY: "project-gateway-credential",
      VERCEL_OIDC_TOKEN: "vercel-oidc-credential",
    })).toEqual({ kind: "api-key", value: "project-gateway-credential" });
  });

  test("accepts the legacy local variable during credential migration", () => {
    expect(resolveGatewayCredential({
      STRIPEDEX_LLM_API_KEY: "legacy-project-credential",
    })).toEqual({ kind: "api-key", value: "legacy-project-credential" });
  });

  test("lets the Gateway SDK authenticate Vercel OIDC itself", () => {
    const credential = resolveGatewayCredential({
      VERCEL_OIDC_TOKEN: "vercel-oidc-credential",
    });

    expect(credential).toEqual({ kind: "oidc" });
    expect(credential === null ? null : gatewayOptionsForCredential(credential)).toBeUndefined();
    expect(gatewayOptionsForCredential({
      kind: "api-key",
      value: "project-gateway-credential",
    })).toEqual({ apiKey: "project-gateway-credential" });
  });

  test("rejects malformed model identifiers", () => {
    expect(() => resolveGatewayModel("missing-provider")).toThrow();
    expect(resolveGatewayModel("openai/gpt-5-mini")).toBe("openai/gpt-5-mini");
    expect(resolveGatewayModel("openai/gpt-5.6-sol")).toBe("openai/gpt-5.6-sol");
  });
});
