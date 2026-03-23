import type { Env, ResolvedCloudflareEnv } from "@/types/env";

export function parseCloudflareEnv(
  bindings: Partial<Env> | undefined,
): ResolvedCloudflareEnv {
  return bindings as ResolvedCloudflareEnv;
}
