import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { Hono } from "hono";
import type { Env } from "@/types/env";
import { GeneralCode } from "@/utils/code";
import { fail, success } from "@/utils/response";

interface BilibiliApiPayload {
  code: number;
  data?: {
    title?: string;
    desc?: string;
    pic?: string;
    owner?: {
      name?: string;
    };
  };
}

type BilibiliViewData = ReturnType<typeof buildFallback>;

const bilibiliViewQuery = type({
  bvid: "string >= 1",
});

const imageQuery = type({
  url: "string.url",
});

const BILIBILI_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;

const bilibiliMetadataCache = new Map<
  string,
  { data: BilibiliViewData; expiresAt: number }
>();

function getCachedBilibiliData(bvid: string): BilibiliViewData | null {
  const cached = bilibiliMetadataCache.get(bvid);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    bilibiliMetadataCache.delete(bvid);
    return null;
  }
  return cached.data;
}

function setCachedBilibiliData(bvid: string, data: BilibiliViewData) {
  bilibiliMetadataCache.set(bvid, {
    data,
    expiresAt: Date.now() + BILIBILI_METADATA_CACHE_TTL_MS,
  });
}

function isAllowedImageHost(hostname: string) {
  return /(^|\.)hdslb\.com$/i.test(hostname);
}

function buildFallback(bvid: string) {
  return {
    bvid,
    title: bvid,
    author: "Bilibili",
    description: "视频信息暂时不可用，点击可直接跳转到视频页",
    coverUrl: "",
    videoUrl: `https://www.bilibili.com/video/${bvid}`,
    degraded: true,
  };
}

export const proxyRoutes = new Hono<{ Bindings: Env }>()
  .get(
    "/bilibili/view",
    arktypeValidator("query", bilibiliViewQuery),
    async (c) => {
      const query = c.req.valid("query");
      const traceId = c.get("traceId");

      const matched = query.bvid.match(/^BV([0-9A-Za-z]+)$/i);
      if (!matched) {
        return c.json(
          fail({
            message: "bvid 参数不合法",
            traceId,
            code: GeneralCode.InternalError,
          }),
          400,
        );
      }

      const bvid = `BV${matched[1]}`;
      const fallback = buildFallback(bvid);

      const cached = getCachedBilibiliData(bvid);
      if (cached) {
        return c.json(success({ data: cached, traceId }), 200);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      try {
        const upstream = await fetch(
          `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
          {
            headers: {
              accept: "application/json",
              referer: "https://www.bilibili.com/",
              "user-agent": c.req.header("user-agent") ?? "Nodal/1.0",
            },
            signal: controller.signal,
          },
        );

        if (!upstream.ok) {
          setCachedBilibiliData(bvid, fallback);
          return c.json(success({ data: fallback, traceId }), 200);
        }

        const payload = (await upstream.json()) as BilibiliApiPayload;
        if (payload.code !== 0 || !payload.data) {
          setCachedBilibiliData(bvid, fallback);
          return c.json(success({ data: fallback, traceId }), 200);
        }

        const coverUrl = payload.data.pic?.startsWith("//")
          ? `https:${payload.data.pic}`
          : (payload.data.pic ?? "");

        const data = {
          bvid,
          title: payload.data.title ?? bvid,
          author: payload.data.owner?.name ?? "Bilibili",
          description: payload.data.desc ?? "",
          coverUrl,
          videoUrl: `https://www.bilibili.com/video/${bvid}`,
          degraded: false,
        };

        setCachedBilibiliData(bvid, data);

        return c.json(success({ data, traceId }), 200);
      } catch {
        setCachedBilibiliData(bvid, fallback);
        return c.json(success({ data: fallback, traceId }), 200);
      } finally {
        clearTimeout(timeout);
      }
    },
  )
  .get("/image", arktypeValidator("query", imageQuery), async (c) => {
    const query = c.req.valid("query");

    let target: URL;
    try {
      target = new URL(query.url);
    } catch {
      return c.text("invalid image url", 400);
    }

    if (target.protocol !== "https:") {
      return c.text("only https image url is allowed", 400);
    }

    if (!isAllowedImageHost(target.hostname)) {
      return c.text("image host is not allowed", 403);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const upstream = await fetch(target.toString(), {
        headers: {
          referer: "https://www.bilibili.com/",
          "user-agent": c.req.header("user-agent") ?? "Nodal/1.0",
        },
        signal: controller.signal,
      });

      if (!upstream.ok || !upstream.body) {
        return c.text("failed to fetch image", 502);
      }

      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      return c.text("image upstream timeout", 504);
    } finally {
      clearTimeout(timeout);
    }
  });
