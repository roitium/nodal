import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";
import type { SessionPayload, SessionUser } from "@/types/env";

type JwtHelper = {
  sign: (payload: Record<string, unknown>) => Promise<string>;
  verify: (token: string) => Promise<Record<string, unknown> | false>;
};

declare module "hono" {
  interface ContextVariableMap {
    traceId: string;
    tenant: string | null;
    user: SessionUser | null;
    jwt: JwtHelper;
    db: PostgresJsDatabase<typeof schema>;
  }
}
