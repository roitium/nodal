import type { MiddlewareHandler } from "hono";
import { getDb } from "@/db/db";
import type { CloudflareBindings } from "@/types/env";
import { getEnv } from "@/utils/env";

export const dbMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  const databaseUrl = getEnv(c.env, "DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  c.set("db", getDb(databaseUrl));
  await next();
};
