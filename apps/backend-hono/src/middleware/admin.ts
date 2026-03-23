import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Env } from "@/types/env";
import { AdminCode, GeneralCode } from "@/utils/code";
import { fail } from "@/utils/response";

export const adminMiddleware: MiddlewareHandler<{
  Bindings: Env;
}> = async (c, next) => {
  const user = c.get("user");
  const db = c.get("db");
  const traceId = c.get("traceId");

  if (!user) {
    return c.json(
      fail({ message: "请先登录", code: GeneralCode.NeedLogin, traceId }),
      401
    );
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { isAdmin: true },
  });

  if (!userRecord?.isAdmin) {
    return c.json(
      fail({ message: "无权访问", code: AdminCode.Forbidden, traceId }),
      403
    );
  }

  c.set("isAdmin", true);
  await next();
};
