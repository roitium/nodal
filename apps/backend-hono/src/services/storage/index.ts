import type { Env, ResolvedCloudflareEnv } from "@/types/env";
import type { IStorageProvider } from "@/services/storage/interface";
import { S3StorageProvider } from "@/services/storage/providers/s3";
import { SupabaseStorageProvider } from "@/services/storage/providers/supabase";

export function createStorageService(
  env: ResolvedCloudflareEnv,
  bindings?: Partial<Env>,
): IStorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "s3":
    case "r2": {
      return new S3StorageProvider(env);
    }
    case "supabase":
    default:
      return new SupabaseStorageProvider(env);
  }
}
