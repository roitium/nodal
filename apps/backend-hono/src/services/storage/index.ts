import type { CloudflareBindings } from "@/types/env";
import type { IStorageProvider } from "@/services/storage/interface";
import { SupabaseStorageProvider } from "@/services/storage/providers/supabase";
import { resolveEnv } from "@/utils/env";

export function createStorageService(
  env: CloudflareBindings,
): IStorageProvider {
  const resolvedEnv = resolveEnv(env);
  const provider = resolvedEnv.STORAGE_PROVIDER;

  switch (provider) {
    case "supabase":
    default:
      return new SupabaseStorageProvider(resolvedEnv);
  }
}
