import { ExternalLink, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getBilibiliVideoUrl,
  normalizeBilibiliBvid,
  type BilibiliCardData,
} from "~/lib/bilibili";
import { API_BASE_URL } from "~/lib/api";
import { cn } from "~/lib/utils";

type CardState =
  | { status: "loading" }
  | { status: "ready"; data: BilibiliCardData }
  | { status: "error" };

const bilibiliDataCache = new Map<string, BilibiliCardData>();
const bilibiliPromiseCache = new Map<string, Promise<BilibiliCardData>>();

function buildFallbackCardData(bvid: string): BilibiliCardData {
  return {
    bvid,
    title: bvid,
    author: "Bilibili",
    description: "视频信息暂时不可用，点击可直接跳转到视频页",
    coverUrl: "",
    videoUrl: getBilibiliVideoUrl(bvid),
    degraded: true,
  };
}

function getDescription(description: string) {
  const trimmed = description.trim();
  if (!trimmed) return "打开 Bilibili 查看详情";
  return trimmed;
}

async function loadBilibiliCard(bvid: string) {
  const cached = bilibiliDataCache.get(bvid);
  if (cached) {
    return cached;
  }

  const pending = bilibiliPromiseCache.get(bvid);
  if (pending) {
    return pending;
  }

  const proxyApiUrl = `${API_BASE_URL}/proxy/bilibili/view?bvid=${encodeURIComponent(bvid)}`;

  const parseResponse = (payload: any): BilibiliCardData => {
    const data = payload?.data;
    if (!data) {
      return buildFallbackCardData(bvid);
    }

    return {
      bvid,
      title: data.title ?? bvid,
      author: data.author ?? "Bilibili",
      description: data.description ?? "",
      coverUrl:
        typeof data.coverUrl === "string" && data.coverUrl.length > 0
          ? `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(data.coverUrl.replace(/^http:/, "https:") )}`
          : "",
      videoUrl: data.videoUrl ?? getBilibiliVideoUrl(bvid),
      degraded: data.degraded ?? false,
    };
  };

  const fetchBilibili = async () => {
    const response = await fetch(proxyApiUrl);
    if (!response.ok) {
      return buildFallbackCardData(bvid);
    }

    const payload = (await response.json()) as {
      data?: BilibiliCardData;
      error?: string | null;
    };

    if (!payload || payload.error) {
      return buildFallbackCardData(bvid);
    }

    return parseResponse(payload);
  };

  const request = fetchBilibili()
    .catch(() => buildFallbackCardData(bvid))
    .then((data) => {
      bilibiliDataCache.set(bvid, data);
      bilibiliPromiseCache.delete(bvid);
      return data;
    })
    .catch(() => {
      bilibiliPromiseCache.delete(bvid);
      const fallback = buildFallbackCardData(bvid);
      bilibiliDataCache.set(bvid, fallback);
      return fallback;
    });

  bilibiliPromiseCache.set(bvid, request);
  return request;
}

export function BilibiliCard({
  bvid,
  className,
}: {
  bvid?: string;
  className?: string;
}) {
  const normalizedBvid = normalizeBilibiliBvid(bvid);
  const [state, setState] = useState<CardState>(() => {
    if (!normalizedBvid) {
      return { status: "error" };
    }

    const cached = bilibiliDataCache.get(normalizedBvid);
    return cached ? { status: "ready", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (!normalizedBvid) {
      setState({ status: "error" });
      return;
    }

    const cached = bilibiliDataCache.get(normalizedBvid);
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void loadBilibiliCard(normalizedBvid)
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "ready", data: buildFallbackCardData(normalizedBvid) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedBvid]);

  if (!normalizedBvid) {
    return null;
  }

  const fallbackUrl = getBilibiliVideoUrl(normalizedBvid);
  const title = state.status === "ready" ? state.data.title : normalizedBvid;
  const author = state.status === "ready" ? state.data.author : "Bilibili";
  const description =
    state.status === "ready"
      ? state.data.degraded
        ? state.data.description
        : getDescription(state.data.description)
      : state.status === "error"
        ? "暂时无法加载视频信息，点击可直接跳转到视频页"
        : "正在加载视频信息...";
  const coverUrl = state.status === "ready" ? state.data.coverUrl : "";
  const href = state.status === "ready" ? state.data.videoUrl : fallbackUrl;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "not-prose my-4 flex overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent/20",
        className
      )}
    >
      <div className="flex w-36 min-h-28 shrink-0 self-stretch items-center justify-center overflow-hidden bg-muted">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="block h-full w-full object-cover" />
        ) : (
          <div className="text-xs text-muted-foreground">Bilibili</div>
        )}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <PlayCircle className="h-3.5 w-3.5" />
          <span>Bilibili</span>
        </div>
        <div className="text-sm font-semibold leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
          {title}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{author}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
          {description}
        </p>
      </div>
      <div className="flex items-start p-3 text-muted-foreground">
        <ExternalLink className="h-4 w-4" />
      </div>
    </a>
  );
}
