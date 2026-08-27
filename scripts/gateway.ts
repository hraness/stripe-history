import { createGateway } from "@ai-sdk/gateway-v4";
import type { z } from "zod";
import { generateText, Output } from "ai-v7";

const DEFAULT_MODEL = "openai/gpt-5-mini";

export type GatewayReasoningEffort = "high" | "max" | "xhigh";

export type GatewayCredential =
  | Readonly<{ kind: "api-key"; value: string }>
  | Readonly<{ kind: "oidc" }>;

function configuredCredential(value: unknown): value is string {
  return typeof value === "string"
    && new TextEncoder().encode(value).byteLength >= 16
    && new TextEncoder().encode(value).byteLength <= 8_192
    && /^[\x21-\x7e]+$/u.test(value);
}

export function resolveGatewayCredential(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GatewayCredential | null {
  for (const value of [
    environment.STRIPE_HISTORY_LLM_API_KEY,
    // Accept the pre-rename local variable during credential migration.
    environment.STRIPEDEX_LLM_API_KEY,
    environment.AI_GATEWAY_API_KEY,
  ]) {
    if (configuredCredential(value)) return { kind: "api-key", value };
  }
  if (configuredCredential(environment.VERCEL_OIDC_TOKEN)) return { kind: "oidc" };
  return null;
}

export function gatewayOptionsForCredential(
  credential: GatewayCredential,
): Readonly<{ apiKey: string }> | undefined {
  return credential.kind === "api-key" ? { apiKey: credential.value } : undefined;
}

export function resolveGatewayModel(
  value: unknown = process.env.STRIPE_HISTORY_MODEL ?? process.env.STRIPEDEX_MODEL,
): string {
  if (value === undefined) return DEFAULT_MODEL;
  if (
    typeof value !== "string"
    || !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u.test(value)
  ) {
    throw new Error("STRIPE_HISTORY_MODEL must be a gateway provider/model identifier");
  }
  return value;
}

export async function generateStructured<S extends z.ZodType>({
  credential,
  maxOutputTokens = 16_384,
  model,
  name,
  prompt,
  reasoningEffort,
  schema,
  system,
  tags,
  timeoutMs = 120_000,
}: Readonly<{
  credential: GatewayCredential;
  maxOutputTokens?: number;
  model?: string;
  name: string;
  prompt: string;
  reasoningEffort?: GatewayReasoningEffort;
  schema: S;
  system: string;
  tags: readonly string[];
  timeoutMs?: number;
}>): Promise<z.infer<S>> {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 512 || maxOutputTokens > 16_384) {
    throw new Error("maxOutputTokens must be an integer from 512 through 16384");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 600_000) {
    throw new Error("timeoutMs must be an integer from 10000 through 600000");
  }
  const gateway = createGateway(gatewayOptionsForCredential(credential));
  const result = await generateText({
    abortSignal: AbortSignal.timeout(timeoutMs),
    maxOutputTokens,
    maxRetries: 0,
    model: gateway(resolveGatewayModel(model)),
    output: Output.object({ name, schema }),
    prompt,
    providerOptions: {
      gateway: {
        disallowPromptTraining: true,
        tags: [...tags],
        zeroDataRetention: true,
      },
      ...(reasoningEffort === undefined
        ? {}
        : {
            openai: {
              reasoningEffort,
              reasoningSummary: null,
            },
          }),
    },
    system,
  });
  return schema.parse(result.output);
}
