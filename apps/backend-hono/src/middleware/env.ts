import type { MiddlewareHandler } from "hono";
import type { Env } from "@/types/env";
import { parseCloudflareEnv } from "@/utils/env";

export const envMiddleware: MiddlewareHandler<{
  Bindings: Env;
}> = async (c, next) => {
  c.set("env", parseCloudflareEnv(c.env));
  await next();
};
