import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { and, desc, eq, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  v7 as uuidv7,
  validate as uuidValidate,
  version as uuidVersion,
} from "uuid";
import { memos, resources, users } from "@/db/schema";
import type { CloudflareBindings } from "@/types/env";
import { GeneralCode, MemoCode, UserCode } from "@/utils/code";
import { fail, success } from "@/utils/response";

const timelineQuery = type({
  "limit?": "string",
  "cursorCreatedAt?": "string",
  "cursorId?": "string",
  "username?": "string",
  "scope?": "'self' | 'explore'",
  "date?": "string",
  "parentId?": "string",
});

const publishBody = type({
  content: "string",
  "visibility?": "'public' | 'private'",
  "parentId?": "string",
  "quoteId?": "string",
  "resources?": "string[]",
  "isPinned?": "boolean",
  "createdAt?": "string",
  "id?": "string",
});

const memoIdParam = type({
  id: "string",
});

const patchBody = type({
  "isPinned?": "boolean",
  "visibility?": "'public' | 'private'",
  "content?": "string",
  "resources?": "string[]",
  "quoteId?": "string | null",
  "createdAt?": "string",
});

const statsQuery = type({
  "username?": "string",
});

const searchQuery = type({
  keyword: "string",
});

const authorColumns = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

const miniAuthorColumns = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const resourceColumns = {
  id: true,
  externalLink: true,
  type: true,
  size: true,
  memoId: true,
  filename: true,
  createdAt: true,
} as const;

const memoWith = {
  author: {
    columns: authorColumns,
  },
  quotedMemo: {
    with: {
      author: {
        columns: miniAuthorColumns,
      },
    },
  },
  resources: {
    columns: resourceColumns,
  },
  replies: {
    extras: (replyTable: any, { sql: sqlBuilder }: any) => ({
      subReplyCount: sqlBuilder<number>`(
        SELECT count(*)
        FROM ${memos} sub
        WHERE sub.parent_id = ${replyTable.id}
      )`.as("sub_reply_count"),
    }),
    with: {
      author: {
        columns: miniAuthorColumns,
      },
      quotedMemo: true,
      resources: {
        columns: resourceColumns,
      },
    },
  },
} as const;

export const memosRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .get("/timeline", arktypeValidator("query", timelineQuery), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const tenant = c.get("tenant");
    const db = c.get("db");
    const traceId = c.get("traceId");

    const limit = query.limit ? Number.parseInt(query.limit, 10) : 20;
    const { cursorCreatedAt, cursorId, date, parentId, scope } = query;
    const targetUsername = tenant ?? query.username;
    const currentUserId = user?.id ?? "";

    const filters = parentId
      ? [eq(memos.parentId, parentId)]
      : [isNull(memos.parentId)];

    if (scope === "self") {
      if (!currentUserId) {
        return c.json(
          fail({
            message: "请先登录",
            code: GeneralCode.NeedLogin,
            traceId,
          }),
          401,
        );
      }
      filters.push(eq(memos.userId, currentUserId));
    } else if (scope === "explore") {
      filters.push(eq(memos.visibility, "public"));
    } else if (targetUsername) {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.username, targetUsername),
      });
      if (!targetUser) {
        return c.json(
          fail({
            message: "用户不存在",
            code: UserCode.NotFound,
            traceId,
          }),
          404,
        );
      }

      filters.push(eq(memos.userId, targetUser.id));
      if (targetUser.id !== currentUserId) {
        filters.push(eq(memos.visibility, "public"));
      }
    } else {
      if (currentUserId) {
        filters.push(
          or(eq(memos.visibility, "public"), eq(memos.userId, currentUserId))!,
        );
      } else {
        filters.push(eq(memos.visibility, "public"));
      }
    }

    if (date) {
      filters.push(eq(sql`DATE(${memos.createdAt})`, date));
    }

    if (cursorCreatedAt && cursorId) {
      const cursorDate = new Date(cursorCreatedAt);
      filters.push(
        or(
          lt(memos.createdAt, cursorDate),
          and(eq(memos.createdAt, cursorDate), lt(memos.id, cursorId)),
        )!,
      );
      if (!date) {
        filters.push(eq(memos.isPinned, false));
      }
    }

    const data = await db.query.memos.findMany({
      where: and(...filters),
      orderBy: [desc(memos.isPinned), desc(memos.createdAt), desc(memos.id)],
      limit: limit + 1,
      with: memoWith,
    });

    const hasNextPage = data.length > limit;
    const items = hasNextPage ? data.slice(0, limit) : data;

    return c.json(
      success({
        data: {
          data: items,
          nextCursor: hasNextPage
            ? {
                createdAt: items[items.length - 1]?.createdAt ?? "",
                id: items[items.length - 1]?.id ?? "",
              }
            : null,
        },
        traceId,
      }),
      200,
    );
  })
  .post("/publish", arktypeValidator("json", publishBody), async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const user = c.get("user");
    const traceId = c.get("traceId");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          code: GeneralCode.NeedLogin,
          traceId,
        }),
        401,
      );
    }

    if (body.id && !(uuidValidate(body.id) && uuidVersion(body.id) === 7)) {
      return c.json(
        fail({
          message: "id 不是有效的 UUIDv7",
          code: MemoCode.ValidationFailed,
          traceId,
        }),
        400,
      );
    }

    const newId = body.id ?? uuidv7();
    let path = `/${newId}/`;

    if (body.parentId) {
      if (body.isPinned) {
        return c.json(
          fail({
            message: "回复的笔记不能被置顶",
            code: MemoCode.ValidationFailed,
            traceId,
          }),
          400,
        );
      }

      const parent = await db.query.memos.findFirst({
        where: eq(memos.id, body.parentId),
        columns: { path: true, visibility: true },
      });

      if (!parent) {
        return c.json(
          fail({
            message: "回复的笔记不存在",
            code: MemoCode.NotFound,
            traceId,
          }),
          404,
        );
      }

      path = `${parent.path}${newId}/`;
    }

    await db.transaction(async (tx) => {
      await tx.insert(memos).values({
        id: newId,
        content: body.content,
        userId: user.id,
        parentId: body.parentId,
        quoteId: body.quoteId,
        visibility: body.visibility ?? "public",
        path,
        isPinned: body.isPinned ?? false,
        createdAt: new Date(body.createdAt ?? Date.now()),
      });

      if (body.resources && body.resources.length > 0) {
        await tx
          .update(resources)
          .set({ memoId: newId })
          .where(
            and(
              inArray(resources.id, body.resources),
              eq(resources.userId, user.id),
            ),
          );
      }
    });

    const result = await db.query.memos.findFirst({
      where: eq(memos.id, newId),
      with: memoWith,
    });

    return c.json(success({ data: result, traceId }), 200);
  })
  .get("/stats", arktypeValidator("query", statsQuery), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const db = c.get("db");
    const tenant = c.get("tenant");
    const traceId = c.get("traceId");

    const targetUsername = tenant ?? query.username;
    let targetUserId = user?.id;

    if (targetUsername) {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.username, targetUsername),
      });
      if (targetUser) targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return c.json(
        fail({ message: "用户不存在", code: UserCode.NotFound, traceId }),
        404,
      );
    }

    const stats = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(memos)
      .where(
        and(
          eq(memos.userId, targetUserId),
          targetUserId === user?.id
            ? undefined
            : eq(memos.visibility, "public"),
          sql`created_at >= NOW() - INTERVAL '1 year'`,
        ),
      )
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return c.json(success({ data: stats, traceId }), 200);
  })
  .get("/search", arktypeValidator("query", searchQuery), async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const traceId = c.get("traceId");
    const query = c.req.valid("query");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          code: GeneralCode.NeedLogin,
          traceId,
        }),
        401,
      );
    }

    if (query.keyword.trim() === "") {
      return c.json(
        fail({
          message: "关键词不能为空",
          code: MemoCode.ValidationFailed,
          traceId,
        }),
        400,
      );
    }

    const keyword = `%${query.keyword}%`;
    const result = await db.query.memos.findMany({
      where: and(
        like(memos.content, keyword),
        or(eq(memos.userId, user.id), eq(memos.visibility, "public")),
      ),
      orderBy: [desc(memos.createdAt)],
      with: memoWith,
    });

    return c.json(success({ data: result, traceId }), 200);
  })
  .get("/:id", arktypeValidator("param", memoIdParam), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const db = c.get("db");
    const traceId = c.get("traceId");

    const memo = await db.query.memos.findFirst({
      where: eq(memos.id, id),
      with: memoWith,
    });

    if (!memo) {
      return c.json(
        fail({
          message: "memo 不存在",
          code: MemoCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    if (memo.visibility === "private" && memo.userId !== user?.id) {
      return c.json(
        fail({
          message: "无权查看",
          code: MemoCode.NoPermission,
          traceId,
        }),
        403,
      );
    }

    return c.json(success({ data: memo, traceId }), 200);
  })
  .delete("/:id", arktypeValidator("param", memoIdParam), async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const traceId = c.get("traceId");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          code: GeneralCode.NeedLogin,
          traceId,
        }),
        401,
      );
    }

    const memo = await db.query.memos.findFirst({
      where: eq(memos.id, id),
    });

    if (!memo) {
      return c.json(
        fail({
          message: "该记录不存在",
          code: MemoCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    if (memo.userId !== user.id) {
      return c.json(
        fail({
          message: "无权删除",
          code: MemoCode.NoPermission,
          traceId,
        }),
        403,
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(memos).where(eq(memos.id, id));
      await tx.delete(resources).where(eq(resources.memoId, id));
    });

    return c.json(success({ data: true, traceId }), 200);
  })
  .patch(
    "/:id",
    arktypeValidator("param", memoIdParam),
    arktypeValidator("json", patchBody),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const body = c.req.valid("json");
      const { id } = c.req.valid("param");
      const traceId = c.get("traceId");

      if (!user) {
        return c.json(
          fail({
            message: "请先登录",
            code: GeneralCode.NeedLogin,
            traceId,
          }),
          401,
        );
      }

      const memo = await db.query.memos.findFirst({
        where: eq(memos.id, id),
        with: {
          resources: true,
        },
      });

      if (!memo) {
        return c.json(
          fail({
            message: "找不到该记录",
            code: MemoCode.NotFound,
            traceId,
          }),
          404,
        );
      }

      if (memo.userId !== user.id) {
        return c.json(
          fail({
            message: "无权操作",
            code: MemoCode.NoPermission,
            traceId,
          }),
          403,
        );
      }

      const {
        isPinned,
        visibility,
        content,
        resources: resourcesIds,
        quoteId,
        createdAt,
      } = body;

      await db.transaction(async (tx) => {
        await tx
          .update(memos)
          .set({
            isPinned: isPinned !== undefined ? isPinned : memo.isPinned,
            visibility: visibility !== undefined ? visibility : memo.visibility,
            content: content !== undefined ? content : memo.content,
            quoteId: quoteId !== undefined ? quoteId : memo.quoteId,
            createdAt: createdAt ? new Date(createdAt) : memo.createdAt,
          })
          .where(eq(memos.id, id));

        if (resourcesIds === undefined) {
          return;
        }

        if (memo.resources && resourcesIds.length > 0) {
          await tx
            .update(resources)
            .set({ memoId: null })
            .where(
              and(eq(resources.memoId, memo.id), eq(resources.userId, user.id)),
            );
        }

        if (resourcesIds) {
          await tx
            .update(resources)
            .set({ memoId: id })
            .where(
              and(
                inArray(resources.id, resourcesIds),
                eq(resources.userId, user.id),
              ),
            );
        }
      });

      return c.json(
        success({
          data: true,
          traceId,
        }),
        200,
      );
    },
  );
