import type { IStorageProvider } from "@/services/storage/interface";
import { S3StorageProvider } from "@/services/storage/providers/s3";
import { SupabaseStorageProvider } from "@/services/storage/providers/supabase";
import type { StorageConfig } from "@/types/storage-config";

export function createStorageService(config: StorageConfig): IStorageProvider {
  switch (config.STORAGE_PROVIDER) {
    case "s3":
    case "r2": {
      return new S3StorageProvider(config);
    }
    case "supabase":
    default:
      return new SupabaseStorageProvider(config);
  }
}
