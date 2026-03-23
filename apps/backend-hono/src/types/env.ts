export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
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

export type ResolvedCloudflareEnv = Env;

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
