import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuidv7 } from "uuid";
import { users } from "@/db/schema";
import type { CloudflareBindings } from "@/types/env";
import { AuthCode, GeneralCode } from "@/utils/code";
import { hashPassword, verifyPassword } from "@/utils/password";
import { fail, success } from "@/utils/response";

const registerBody = type({
  username: "string >= 3",
  email: "string.email",
  password: "string >= 6",
});

const loginBody = type({
  login: "string >= 1",
  password: "string >= 1",
});

const patchMeBody = type({
  "displayName?": "string",
  "avatarUrl?": "string",
  "coverImageUrl?": "string",
  "bio?": "string",
});

const usernameParam = type({
  username: "string >= 1",
});

async function sha256Hex(input: string) {
  const message = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", message);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const authRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .post("/register", arktypeValidator("json", registerBody), async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const jwt = c.get("jwt");
    const traceId = c.get("traceId");

    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.email, body.email), eq(users.username, body.username)),
      columns: { id: true },
    });

    if (existingUser) {
      return c.json(
        fail({
          message: "邮箱或用户名已被注册",
          code: AuthCode.AlreadyExist,
          traceId,
        }),
        409,
      );
    }

    const hashedPassword = await hashPassword(body.password);
    const hash = await sha256Hex(body.email.trim().toLowerCase());

    const [newUser] = await db
      .insert(users)
      .values({
        username: body.username,
        passwordHash: hashedPassword,
        displayName: body.username,
        avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=200&d=identicon`,
        email: body.email,
        id: uuidv7(),
      })
      .returning();

    if (!newUser) {
      return c.json(
        fail({
          message: "创建用户失败",
          traceId,
          code: GeneralCode.InternalError,
        }),
        500,
      );
    }

    const token = await jwt.sign({
      sub: newUser.id,
      username: newUser.username,
    });

    return c.json(
      success({
        data: {
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            avatarUrl: newUser.avatarUrl,
          },
        },
        traceId,
      }),
      200,
    );
  })
  .post("/login", arktypeValidator("json", loginBody), async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const jwt = c.get("jwt");
    const traceId = c.get("traceId");

    const user = await db.query.users.findFirst({
      where: or(eq(users.email, body.login), eq(users.username, body.login)),
    });

    if (!user) {
      return c.json(
        fail({
          message: "账号或密码错误",
          code: AuthCode.AccountPasswordMismatch,
          traceId,
        }),
        401,
      );
    }

    const isMatch = await verifyPassword(body.password, user.passwordHash);
    if (!isMatch) {
      return c.json(
        fail({
          message: "账号或密码错误",
          code: AuthCode.AccountPasswordMismatch,
          traceId,
        }),
        401,
      );
    }

    const token = await jwt.sign({
      sub: user.id,
      username: user.username,
    });

    return c.json(
      success({
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
        },
        traceId,
      }),
      200,
    );
  })
  .patch("/me", arktypeValidator("json", patchMeBody), async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const traceId = c.get("traceId");
    const body = c.req.valid("json");

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

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!userRecord) {
      return c.json(
        fail({
          message: "用户不存在",
          code: AuthCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    await db
      .update(users)
      .set({
        displayName: body.displayName ?? userRecord.displayName,
        avatarUrl: body.avatarUrl ?? userRecord.avatarUrl,
        coverImageUrl: body.coverImageUrl ?? userRecord.coverImageUrl,
        bio: body.bio ?? userRecord.bio,
      })
      .where(eq(users.id, user.id));

    const updatedUserRecord = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        passwordHash: false,
      },
    });

    if (!updatedUserRecord) {
      return c.json(
        fail({
          message: "用户不存在",
          code: AuthCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    return c.json(success({ data: updatedUserRecord, traceId }), 200);
  })
  .get("/me", async (c) => {
    const user = c.get("user");
    const db = c.get("db");
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

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        passwordHash: false,
      },
    });

    if (!userRecord) {
      return c.json(
        fail({
          message: "用户不存在",
          code: AuthCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    return c.json(success({ data: userRecord, traceId }), 200);
  })
  .get(
    "/users/:username",
    arktypeValidator("param", usernameParam),
    async (c) => {
      const { username } = c.req.valid("param");
      const db = c.get("db");
      const traceId = c.get("traceId");

      const userRecord = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          coverImageUrl: true,
          bio: true,
          createdAt: true,
          passwordHash: false,
        },
      });

      if (!userRecord) {
        return c.json(
          fail({
            message: "用户不存在",
            code: AuthCode.NotFound,
            traceId,
          }),
          404,
        );
      }

      return c.json(success({ data: userRecord, traceId }), 200);
    },
  );
