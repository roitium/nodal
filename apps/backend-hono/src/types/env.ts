import { type } from "arktype";

// Hono 需要这个类型作为 Bindings 元数据
export type Env = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  SETTINGS_ENCRYPTION_KEY?: string;
  ROOT_DOMAIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STORAGE_BUCKET?: string;
  STORAGE_PROVIDER?: string;
  S3_PUBLIC_URL?: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
};

// 使用 arktype 定义解析后的环境变量 schema
const CloudflareEnvSchema = type({
  DATABASE_URL: "string",
  JWT_SECRET: "string",
  ROOT_DOMAIN: "string | undefined",
  SUPABASE_URL: "string | undefined",
  SUPABASE_SERVICE_ROLE_KEY: "string | undefined",
  STORAGE_BUCKET: "string | undefined",
  STORAGE_PROVIDER: "string | undefined",
  S3_PUBLIC_URL: "string | undefined",
  S3_ENDPOINT: "string | undefined",
  S3_ACCESS_KEY_ID: "string | undefined",
  S3_SECRET_ACCESS_KEY: "string | undefined",
  S3_REGION: "string | undefined",
});

// 从 schema 推导最终的类型
export type ResolvedCloudflareEnv = typeof CloudflareEnvSchema.infer;

export { CloudflareEnvSchema };

export type SessionUser = {
  id: string;
  username: string;
};

export type SessionPayload = {
  sub: string;
  username: string;
  exp?: number;
  iat?: number;
};
