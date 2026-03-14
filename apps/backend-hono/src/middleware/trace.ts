import type { MiddlewareHandler } from "hono";
import { v7 as uuidv7 } from "uuid";

export const traceIdMiddleware: MiddlewareHandler = async (c, next) => {
  c.set("traceId", uuidv7());
  await next();
};
