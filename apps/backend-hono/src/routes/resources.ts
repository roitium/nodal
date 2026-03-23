import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuidv7 } from "uuid";
import { resources } from "@/db/schema";
import { createStorageService } from "@/services/storage";
import type { Env } from "@/types/env";
import { GeneralCode, ResourceCode } from "@/utils/code";
import { fail, success } from "@/utils/response";

const uploadUrlQuery = type({
  fileType: "string >= 1",
  ext: "string >= 1",
});

const recordUploadBody = type({
  path: "string >= 1",
  fileType: "string >= 1",
  fileSize: "number >= 0",
  filename: "string >= 1",
  signature: "string >= 1",
});

function addExternalLink<T extends { path: string; provider: string }>(
  resource: T,
  env: Env,
): T & { externalLink: string } {
  const storageService = createStorageService(env);
  return {
    ...resource,
    externalLink: storageService.getPublicUrl(resource.path),
  };
}

function addExternalLinkToArray<T extends { path: string; provider: string }>(
  resources: T[],
  env: Env,
): Array<T & { externalLink: string }> {
  return resources.map((r) => addExternalLink(r, env));
}

export const resourcesRoutes = new Hono<{ Bindings: Env }>()
  .get("/upload-url", arktypeValidator("query", uploadUrlQuery), async (c) => {
    const user = c.get("user");
    const traceId = c.get("traceId");
    const jwt = c.get("jwt");
    const env = c.get("env");
    const query = c.req.valid("query");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          traceId,
          code: GeneralCode.NeedLogin,
        }),
        401,
      );
    }

    const { fileType, ext } = query;
    if (ext.includes(".")) {
      return c.json(
        fail({
          message: "文件后缀不能带点",
          traceId,
          code: ResourceCode.illegalParam,
        }),
        400,
      );
    }
    if (ext.includes("/")) {
      return c.json(
        fail({
          message: "文件后缀不能带斜杠",
          traceId,
          code: ResourceCode.illegalParam,
        }),
        400,
      );
    }

    const path = `resources/${user.id}/${uuidv7()}.${ext}`;
    const payload = {
      user: user.id,
      path,
      fileType,
      ext,
    };

    const token = await jwt.sign(payload);
    const storageService = createStorageService(env, c.env);
    const result = await storageService.getUploadUrl(path, fileType);

    return c.json(
      success({
        data: { ...result, signature: token },
        traceId,
      }),
      200,
    );
  })
  .post(
    "/record-upload",
    arktypeValidator("json", recordUploadBody),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const traceId = c.get("traceId");
      const jwt = c.get("jwt");
      const env = c.get("env");
      const body = c.req.valid("json");

      if (!user) {
        return c.json(
          fail({
            message: "请先登录",
            traceId,
            code: GeneralCode.NeedLogin,
          }),
          401,
        );
      }

      const { path, fileType, fileSize, filename, signature } = body;

      if (!path.startsWith(`resources/${user.id}`)) {
        return c.json(
          fail({
            message: "请求路径不合法",
            traceId,
            code: ResourceCode.illegalParam,
          }),
          403,
        );
      }

      const payload = await jwt.verify(signature);
      if (!payload) {
        return c.json(
          fail({
            message: "签名验证失败",
            traceId,
            code: ResourceCode.illegalParam,
          }),
          403,
        );
      }

      if (payload.path !== path || payload.user !== user.id) {
        return c.json(
          fail({
            message: "签名内包含数据与请求不一致",
            traceId,
            code: ResourceCode.illegalParam,
          }),
          403,
        );
      }

      const storageService = createStorageService(env, c.env);

      const objectMeta = await storageService.headFile(path);
      if (!objectMeta) {
        return c.json(
          fail({
            message: "文件不存在或尚未上传完成",
            traceId,
            code: ResourceCode.NotFound,
          }),
          404,
        );
      }

      if (objectMeta.size !== fileSize) {
        return c.json(
          fail({
            message: "文件大小与上传记录不一致",
            traceId,
            code: ResourceCode.illegalParam,
          }),
          400,
        );
      }

      const normalizedStoredType = objectMeta.contentType
        ?.split(";")[0]
        ?.trim();
      const normalizedRequestedType = fileType.split(";")[0]?.trim();
      if (
        normalizedStoredType &&
        normalizedRequestedType &&
        normalizedStoredType !== normalizedRequestedType
      ) {
        return c.json(
          fail({
            message: "文件类型与上传记录不一致",
            traceId,
            code: ResourceCode.illegalParam,
          }),
          400,
        );
      }

      const [result] = await db
        .insert(resources)
        .values({
          type: fileType,
          size: fileSize,
          provider: storageService.providerName,
          path,
          filename,
          id: uuidv7(),
          userId: user.id,
        })
        .returning();

      if (!result) {
        return c.json(
          fail({
            message: "文件上传失败",
            code: GeneralCode.InternalError,
            traceId,
          }),
          500,
        );
      }

      const resultWithExternalLink = addExternalLink(result, env);
      return c.json(success({ data: resultWithExternalLink, traceId }), 200);
    },
  )
  .get("/user-all", async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const env = c.get("env");
    const traceId = c.get("traceId");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          traceId,
          code: GeneralCode.NeedLogin,
        }),
        401,
      );
    }

    const result = await db.query.resources.findMany({
      where: eq(resources.userId, user.id),
      orderBy: [desc(resources.createdAt)],
    });

    const resultWithExternalLinks = addExternalLinkToArray(result, env);
    return c.json(success({ data: resultWithExternalLinks, traceId }), 200);
  })
  .get("/:id", async (c) => {
    const { id } = c.req.param();
    const user = c.get("user");
    const db = c.get("db");
    const env = c.get("env");
    const traceId = c.get("traceId");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          traceId,
          code: GeneralCode.NeedLogin,
        }),
        401,
      );
    }

    const result = await db.query.resources.findFirst({
      where: and(eq(resources.id, id), eq(resources.userId, user.id)),
    });

    if (!result) {
      return c.json(
        fail({
          message: "资源不存在或该资源并不在你的账户下",
          code: ResourceCode.NotFound,
          traceId,
        }),
        404,
      );
    }

    const resultWithExternalLink = addExternalLink(result, env);
    return c.json(success({ data: resultWithExternalLink, traceId }), 200);
  });
