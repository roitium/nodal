import type { MiddlewareHandler } from "hono";
import { getDb } from "@/db/db";
import type { CloudflareBindings } from "@/types/env";

export const dbMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  const env = c.get("env");
  const databaseUrl = env.DATABASE_URL;

  c.set("db", getDb(databaseUrl));
  await next();
};
