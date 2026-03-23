import { createClient } from "@supabase/supabase-js";
import type { StorageConfig } from "@/types/storage-config";
import type {
  IStorageProvider,
  StoredObjectMeta,
  UploadResult,
} from "@/services/storage/interface";

export class SupabaseStorageProvider implements IStorageProvider {
  private client;
  private bucket: string;
  private url: string;
  readonly providerName = "supabase";

  constructor(config: StorageConfig) {
    if (
      !config.SUPABASE_URL ||
      !config.SUPABASE_SERVICE_ROLE_KEY ||
      !config.STORAGE_BUCKET
    ) {
      throw new Error(
        "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and STORAGE_BUCKET are required for supabase storage",
      );
    }

    this.url = config.SUPABASE_URL;
    this.bucket = config.STORAGE_BUCKET;

    this.client = createClient(this.url, config.SUPABASE_SERVICE_ROLE_KEY);
  }

  async getUploadUrl(path: string): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(`Supabase Storage Error: ${error?.message}`);
    }

    return {
      uploadUrl: data.signedUrl,
      path: data.path,
      headers: {
        token: data.token,
      },
    };
  }

  async headFile(path: string): Promise<StoredObjectMeta | null> {
    const { data: signed, error: signedError } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, 60);

    if (signedError || !signed?.signedUrl) {
      return null;
    }

    const response = await fetch(signed.signedUrl, { method: "HEAD" });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Supabase Storage HEAD failed: ${response.status}`);
    }

    const size = Number.parseInt(
      response.headers.get("content-length") ?? "",
      10,
    );
    const contentType = response.headers.get("content-type") ?? undefined;

    if (!Number.isFinite(size) || size < 0) {
      throw new Error("Supabase Storage HEAD missing content-length");
    }

    return {
      size,
      contentType,
    };
  }

  getPublicUrl(path: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);
    if (error) throw error;
  }
}
