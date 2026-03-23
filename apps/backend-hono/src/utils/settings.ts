import type { DbClient } from "@/db/client";
import { settings } from "@/db/schema";
import { decrypt } from "./encryption";
import type { StorageConfig } from "@/types/storage-config";

const VALID_STORAGE_PROVIDERS = ["supabase", "s3", "r2"] as const;

export async function getStorageConfig(
  db: DbClient,
  encryptionKey?: string,
): Promise<StorageConfig> {
  const allSettings = await db.query.settings.findMany();

  const settingsMap = new Map(allSettings.map((s) => [s.key, s]));

  const getValue = (key: string): string => {
    const setting = settingsMap.get(key);
    if (!setting) return "";
    if (setting.isEncrypted && encryptionKey) {
      try {
        return decrypt(setting.value, encryptionKey);
      } catch {
        return setting.value;
      }
    }
    return setting.value;
  };

  const provider = getValue("STORAGE_PROVIDER");
  const validProvider = VALID_STORAGE_PROVIDERS.includes(provider as any)
    ? (provider as StorageConfig["STORAGE_PROVIDER"])
    : "supabase";

  return {
    STORAGE_PROVIDER: validProvider,
    STORAGE_BUCKET: getValue("STORAGE_BUCKET"),
    SUPABASE_URL: getValue("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: getValue("SUPABASE_SERVICE_ROLE_KEY"),
    S3_ENDPOINT: getValue("S3_ENDPOINT"),
    S3_PUBLIC_URL: getValue("S3_PUBLIC_URL"),
    S3_REGION: getValue("S3_REGION"),
    S3_ACCESS_KEY_ID: getValue("S3_ACCESS_KEY_ID"),
    S3_SECRET_ACCESS_KEY: getValue("S3_SECRET_ACCESS_KEY"),
  };
}
