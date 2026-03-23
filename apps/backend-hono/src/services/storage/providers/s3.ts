import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ResolvedCloudflareEnv } from "@/types/env";
import type {
  IStorageProvider,
  StoredObjectMeta,
  UploadResult,
} from "@/services/storage/interface";

export class S3StorageProvider implements IStorageProvider {
  readonly providerName = "s3";
  private client: S3Client;
  private bucket: string;

  constructor(private env: ResolvedCloudflareEnv) {
    if (
      !env.S3_ENDPOINT ||
      !env.S3_ACCESS_KEY_ID ||
      !env.S3_SECRET_ACCESS_KEY ||
      !env.STORAGE_BUCKET
    ) {
      throw new Error(
        "S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and STORAGE_BUCKET are required for s3 storage",
      );
    }

    this.bucket = env.STORAGE_BUCKET;

    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION || "auto",
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async getUploadUrl(path: string, fileType: string): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 3600,
    });

    return {
      uploadUrl,
      path,
    };
  }

  async headFile(path: string): Promise<StoredObjectMeta | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      if (error.name === "NotFound") {
        return null;
      }
      throw error;
    }
  }

  getPublicUrl(path: string): string {
    if (!this.env.S3_PUBLIC_URL) {
      throw new Error("S3_PUBLIC_URL is required for s3 storage");
    }

    return `${this.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${path}`;
  }

  async deleteFile(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }
}
