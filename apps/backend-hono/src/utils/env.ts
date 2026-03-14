import type { CloudflareBindings, ResolvedCloudflareEnv } from "@/types/env";

const requiredEnvKeys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STORAGE_BUCKET",
] as const;

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export function getEnv(
  bindings: Partial<CloudflareBindings> | undefined,
  key: keyof CloudflareBindings,
): string | undefined {
  const fromBindings = bindings?.[key];
  if (typeof fromBindings === "string" && fromBindings.length > 0) {
    return fromBindings;
  }

  const maybeProcess = (
    globalThis as { process?: { env?: Record<string, string> } }
  ).process;
  const fromProcess = maybeProcess?.env?.[key];

  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }

  return undefined;
}

export function requireEnv(
  bindings: Partial<CloudflareBindings> | undefined,
  key: RequiredEnvKey,
): string {
  const value = getEnv(bindings, key);

  if (!value) {
    throw new Error(`${key} is not set`);
  }

  return value;
}

export function resolveEnv(
  bindings: Partial<CloudflareBindings> | undefined,
): ResolvedCloudflareEnv {
  return {
    DATABASE_URL: requireEnv(bindings, "DATABASE_URL"),
    JWT_SECRET: requireEnv(bindings, "JWT_SECRET"),
    ROOT_DOMAIN: getEnv(bindings, "ROOT_DOMAIN"),
    SUPABASE_URL: requireEnv(bindings, "SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: requireEnv(
      bindings,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
    STORAGE_BUCKET: requireEnv(bindings, "STORAGE_BUCKET"),
    STORAGE_PROVIDER: getEnv(bindings, "STORAGE_PROVIDER") ?? "supabase",
  };
}
