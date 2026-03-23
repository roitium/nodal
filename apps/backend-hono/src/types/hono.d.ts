import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";
import type { ResolvedCloudflareEnv, SessionUser } from "@/types/env";

type JwtHelper = {
  sign: (payload: Record<string, unknown>) => Promise<string>;
  verify: (token: string) => Promise<Record<string, unknown> | false>;
};

declare module "hono" {
  interface ContextVariableMap {
    env: ResolvedCloudflareEnv;
    traceId: string;
    user: SessionUser | null;
    jwt: JwtHelper;
    db: PostgresJsDatabase<typeof schema>;
    isAdmin: boolean;
  }
}
