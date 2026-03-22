import { ArkErrors } from "arktype";
import type { CloudflareBindings, ResolvedCloudflareEnv } from "@/types/env";
import { CloudflareEnvSchema } from "@/types/env";

/**
 * 验证 Cloudflare Worker 环境变量，应用默认值
 * Wrangler 会自动从 .dev.vars（本地）或 Secrets 中加载到 bindings
 * @throws 如果必需的环境变量缺失或验证失败
 */
export function parseCloudflareEnv(
  bindings: Partial<CloudflareBindings> | undefined,
): ResolvedCloudflareEnv {
  const merged = {
    DATABASE_URL: bindings?.DATABASE_URL,
    JWT_SECRET: bindings?.JWT_SECRET,
    ROOT_DOMAIN: bindings?.ROOT_DOMAIN,
    SUPABASE_URL: bindings?.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: bindings?.SUPABASE_SERVICE_ROLE_KEY,
    STORAGE_BUCKET: bindings?.STORAGE_BUCKET,
    STORAGE_PROVIDER: bindings?.STORAGE_PROVIDER || "supabase",
    R2_PUBLIC_BASE_URL: bindings?.R2_PUBLIC_BASE_URL,
  };

  const validated = CloudflareEnvSchema(merged);
  if (validated instanceof ArkErrors) {
    throw new Error(`Invalid environment variables: ${validated.summary}`);
  }

  return validated;
}
