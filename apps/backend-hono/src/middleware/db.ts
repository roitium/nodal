import type { MiddlewareHandler } from "hono";
import { getDb } from "@/db/db";
import type { HonoBindings } from "@/types/hono";

export const dbMiddleware: MiddlewareHandler<HonoBindings> = async (c, next) => {
  const env = c.get("env");
  const databaseUrl = env.DATABASE_URL;

  c.set("db", getDb(databaseUrl));
  await next();
};
