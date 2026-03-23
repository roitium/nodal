import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig } from "@/types/storage-config";
import type {
  IStorageProvider,
  StoredObjectMeta,
  UploadResult,
} from "@/services/storage/interface";

export class S3StorageProvider implements IStorageProvider {
  readonly providerName = "s3";
  private client: S3Client;
  private bucket: string;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    if (
      !config.S3_ENDPOINT ||
      !config.S3_ACCESS_KEY_ID ||
      !config.S3_SECRET_ACCESS_KEY ||
      !config.STORAGE_BUCKET
    ) {
      throw new Error(
        "S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and STORAGE_BUCKET are required for s3 storage",
      );
    }

    // Validate endpoint - must be a pure endpoint without path
    // e.g., https://xxx.r2.cloudflarestorage.com (NOT https://xxx.r2.cloudflarestorage.com/bucket-name)
    const endpointUrl = new URL(config.S3_ENDPOINT);
    if (endpointUrl.pathname && endpointUrl.pathname !== "/") {
      throw new Error(
        `S3_ENDPOINT must be a pure endpoint without path. Got: ${config.S3_ENDPOINT}. Remove the bucket name from the URL.`,
      );
    }

    this.config = config;
    this.bucket = config.STORAGE_BUCKET;

    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT.endsWith("/") 
        ? config.S3_ENDPOINT 
        : config.S3_ENDPOINT + "/",
      region: config.S3_REGION || "auto",
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      tls: true,
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
    if (!this.config.S3_PUBLIC_URL) {
      throw new Error("S3_PUBLIC_URL is required for s3 storage");
    }

    return `${this.config.S3_PUBLIC_URL.replace(/\/$/, "")}/${path}`;
  }

  async deleteFile(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }
}
