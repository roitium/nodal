import type { MiddlewareHandler } from "hono";
import { parseCloudflareEnv } from "@/utils/env";
import type { HonoBindings } from "@/types/hono";

export const envMiddleware: MiddlewareHandler<HonoBindings> = async (c, next) => {
  c.set("env", parseCloudflareEnv(c.env));
  await next();
};
