import { Hono } from "hono";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { type } from "arktype";
import { arktypeValidator } from "@hono/arktype-validator";
import { users } from "@/db/schema";
import { adminMiddleware } from "@/middleware/admin";
import type { HonoBindings } from "@/types/hono";
import { AdminCode } from "@/utils/code";
import { fail, success } from "@/utils/response";

const patchUserBody = type({
  "isAdmin?": "boolean",
  "banned?": "boolean",
  "displayName?": "string",
  "bio?": "string",
  "avatarUrl?": "string",
  "coverImageUrl?": "string",
});

export const adminUsersRoutes = new Hono<HonoBindings>()
  .use(adminMiddleware)
  .get("/", async (c) => {
    const db = c.get("db");
    const traceId = c.get("traceId");

    const query = c.req.query();
    const page = Math.max(1, Number.parseInt(query.page ?? "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? "20", 10)));
    const offset = (page - 1) * limit;

    const search = query.search?.trim();
    const isAdminFilter = query.isAdmin;

    const conditions = [];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.username, searchPattern),
          ilike(users.email, searchPattern)
        )
      );
    }

    if (isAdminFilter !== undefined) {
      const isAdminValue = isAdminFilter === "true" || isAdminFilter === "1";
      conditions.push(eq(users.isAdmin, isAdminValue));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const usersList = await db.query.users.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      columns: {
        passwordHash: false,
      },
    });

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);
    const total = totalResult[0]?.count ?? 0;

    return c.json(
      success({
        data: {
          users: usersList,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        traceId,
      }),
      200
    );
  })
  .get("/:id", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const traceId = c.get("traceId");

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        passwordHash: false,
      },
    });

    if (!user) {
      return c.json(
        fail({
          message: "用户不存在",
          code: AdminCode.UserNotFound,
          traceId,
        }),
        404
      );
    }

    return c.json(success({ data: user, traceId }), 200);
  })
  .patch("/:id", arktypeValidator("json", patchUserBody), async (c) => {
    const db = c.get("db");
    const currentUser = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const traceId = c.get("traceId");

    if (id === currentUser?.id) {
      if (body.banned === true || body.isAdmin !== undefined) {
        return c.json(
          fail({
            message: "不能对自己执行此操作",
            code: AdminCode.SelfAction,
            traceId,
          }),
          403
        );
      }
    }

    if (body.isAdmin === false) {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { isAdmin: true },
      });

      if (targetUser?.isAdmin) {
        const adminCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.isAdmin, true));
        const adminCount = adminCountResult[0]?.count ?? 0;
        if (adminCount <= 1) {
          return c.json(
            fail({
              message: "不能移除最后一个管理员",
              code: AdminCode.LastAdmin,
              traceId,
            }),
            403
          );
        }
      }
    }

    await db
      .update(users)
      .set({ ...body, updatedAt: sql`now()` })
      .where(eq(users.id, id));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { passwordHash: false },
    });

    return c.json(success({ data: updatedUser, traceId }), 200);
  })
  .delete("/:id", async (c) => {
    const db = c.get("db");
    const currentUser = c.get("user");
    const id = c.req.param("id");
    const traceId = c.get("traceId");

    if (id === currentUser?.id) {
      return c.json(
        fail({
          message: "不能删除自己",
          code: AdminCode.SelfAction,
          traceId,
        }),
        403
      );
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { isAdmin: true },
    });

    if (targetUser?.isAdmin) {
      const adminCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isAdmin, true));
      const adminCount = adminCountResult[0]?.count ?? 0;
      if (adminCount <= 1) {
        return c.json(
          fail({
            message: "不能删除最后一个管理员",
            code: AdminCode.LastAdmin,
            traceId,
          }),
          403
        );
      }
    }

    await db.delete(users).where(eq(users.id, id));

    return c.body(null, 204);
  });
