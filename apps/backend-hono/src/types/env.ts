export type CloudflareBindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ROOT_DOMAIN: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STORAGE_BUCKET: string;
  STORAGE_PROVIDER?: string;
};

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
