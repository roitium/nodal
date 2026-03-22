import type { CloudflareBindings, ResolvedCloudflareEnv } from "@/types/env";
import type { IStorageProvider } from "@/services/storage/interface";
import { R2StorageProvider } from "@/services/storage/providers/r2";
import { SupabaseStorageProvider } from "@/services/storage/providers/supabase";

export function createStorageService(
  env: ResolvedCloudflareEnv,
  bindings?: Partial<CloudflareBindings>,
): IStorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "r2": {
      return new R2StorageProvider(env);
    }
    case "supabase":
    default:
      return new SupabaseStorageProvider(env);
  }
}
