import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "@/types/env";
import { parseCloudflareEnv } from "@/utils/env";

export const envMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  c.set("env", parseCloudflareEnv(c.env));
  await next();
};
