import type { MiddlewareHandler } from "hono";
import { v7 as uuidv7 } from "uuid";
import type { HonoBindings } from "@/types/hono";

export const traceIdMiddleware: MiddlewareHandler<HonoBindings> = async (c, next) => {
  c.set("traceId", uuidv7());
  await next();
};
