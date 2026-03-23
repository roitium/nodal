export interface StorageConfig {
  STORAGE_PROVIDER: "supabase" | "s3" | "r2";
  STORAGE_BUCKET: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  S3_ENDPOINT?: string;
  S3_PUBLIC_URL?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}
