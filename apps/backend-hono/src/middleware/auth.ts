import type { MiddlewareHandler } from "hono";
import { sign, verify } from "hono/jwt";
import type { HonoBindings } from "@/types/hono";

export const authMiddleware: MiddlewareHandler<HonoBindings> = async (c, next) => {
  const env = c.get("env");
  const secret = env.JWT_SECRET;

  const jwt = {
    sign: (payload: Record<string, unknown>) => sign(payload, secret),
    verify: async (token: string): Promise<Record<string, unknown> | false> => {
      try {
        const payload = await verify(token, secret, "HS256");
        if (typeof payload !== "object" || payload === null) {
          return false;
        }
        if (!("sub" in payload) || !("username" in payload)) {
          return false;
        }

        return {
          sub: String(payload.sub),
          username: String(payload.username),
          exp: typeof payload.exp === "number" ? payload.exp : undefined,
          iat: typeof payload.iat === "number" ? payload.iat : undefined,
        };
      } catch {
        return false;
      }
    },
  };

  c.set("jwt", jwt);

  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    c.set("user", null);
    return next();
  }

  const payload = await jwt.verify(token);
  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.username !== "string"
  ) {
    c.set("user", null);
    return next();
  }

  c.set("user", { id: payload.sub, username: payload.username });
  await next();
};
