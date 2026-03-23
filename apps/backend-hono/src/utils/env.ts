import { ArkErrors } from "arktype";
import type { Env, ResolvedCloudflareEnv } from "@/types/env";
import { CloudflareEnvSchema } from "@/types/env";

export function parseCloudflareEnv(
  bindings: Partial<Env> | undefined,
): ResolvedCloudflareEnv {
  const merged = {
    DATABASE_URL: bindings?.DATABASE_URL,
    JWT_SECRET: bindings?.JWT_SECRET,
  };

  const validated = CloudflareEnvSchema(merged);
  if (validated instanceof ArkErrors) {
    throw new Error(`Invalid environment variables: ${validated.summary}`);
  }

  return validated;
}
