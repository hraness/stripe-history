import { createGateway } from "@ai-sdk/gateway-v4";
import type { z } from "zod";
import { generateText, Output } from "ai-v7";

const DEFAULT_MODEL = "openai/gpt-5-mini";

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
    environment.STRIPE_GUIDE_LLM_API_KEY,
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
  value: unknown = process.env.STRIPE_GUIDE_MODEL,
): string {
  if (value === undefined) return DEFAULT_MODEL;
  if (
    typeof value !== "string"
    || !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u.test(value)
  ) {
    throw new Error("STRIPE_GUIDE_MODEL must be a gateway provider/model identifier");
  }
  return value;
}

export async function generateStructured<S extends z.ZodType>({
  credential,
  name,
  prompt,
  schema,
  system,
  tags,
}: Readonly<{
  credential: GatewayCredential;
  name: string;
  prompt: string;
  schema: S;
  system: string;
  tags: readonly string[];
}>): Promise<z.infer<S>> {
  const gateway = createGateway(gatewayOptionsForCredential(credential));
  const result = await generateText({
    abortSignal: AbortSignal.timeout(120_000),
    maxOutputTokens: 16_384,
    maxRetries: 0,
    model: gateway(resolveGatewayModel()),
    output: Output.object({ name, schema }),
    prompt,
    providerOptions: {
      gateway: {
        disallowPromptTraining: true,
        tags: [...tags],
        zeroDataRetention: true,
      },
    },
    system,
  });
  return schema.parse(result.output);
}
