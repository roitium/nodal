import type { MiddlewareHandler } from "hono";
import { getDb } from "@/db/db";
import type { CloudflareBindings } from "@/types/env";
import { requireEnv } from "@/utils/env";

export const dbMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  const databaseUrl = requireEnv(c.env, "DATABASE_URL");

  c.set("db", getDb(databaseUrl));
  await next();
};
