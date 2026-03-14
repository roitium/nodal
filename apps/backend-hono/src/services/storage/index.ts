import type { CloudflareBindings } from "@/types/env";
import type { IStorageProvider } from "@/services/storage/interface";
import { SupabaseStorageProvider } from "@/services/storage/providers/supabase";
import { getEnv } from "@/utils/env";

export function createStorageService(
  env: CloudflareBindings,
): IStorageProvider {
  const provider = getEnv(env, "STORAGE_PROVIDER") ?? "supabase";

  const resolvedEnv: CloudflareBindings = {
    DATABASE_URL: getEnv(env, "DATABASE_URL") ?? "",
    JWT_SECRET: getEnv(env, "JWT_SECRET") ?? "",
    ROOT_DOMAIN: getEnv(env, "ROOT_DOMAIN") ?? "",
    SUPABASE_URL: getEnv(env, "SUPABASE_URL") ?? "",
    SUPABASE_SERVICE_ROLE_KEY: getEnv(env, "SUPABASE_SERVICE_ROLE_KEY") ?? "",
    STORAGE_BUCKET: getEnv(env, "STORAGE_BUCKET") ?? "",
    STORAGE_PROVIDER: provider,
  };

  switch (provider) {
    case "supabase":
    default:
      return new SupabaseStorageProvider(resolvedEnv);
  }
}
