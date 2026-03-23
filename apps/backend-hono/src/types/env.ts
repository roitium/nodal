import { type } from "arktype";

export type Env = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  SETTINGS_ENCRYPTION_KEY?: string;
};

const CloudflareEnvSchema = type({
  DATABASE_URL: "string",
  JWT_SECRET: "string",
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
