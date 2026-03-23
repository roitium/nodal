import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";
import type { Env, SessionUser } from "@/types/env";

type JwtHelper = {
  sign: (payload: Record<string, unknown>) => Promise<string>;
  verify: (token: string) => Promise<Record<string, unknown> | false>;
};

export type HonoVariables = {
  env: Env;
  traceId: string;
  user: SessionUser | null;
  jwt: JwtHelper;
  db: PostgresJsDatabase<typeof schema>;
  isAdmin: boolean;
};

export type HonoBindings = {
  Bindings: Env;
  Variables: HonoVariables;
};
