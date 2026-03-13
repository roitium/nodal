import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import type { Memo, User } from "~/lib/api";

export interface OptimisticContext {
  snapshots: Array<[QueryKey, unknown]>;
}

function isMemoLike(value: unknown): value is Memo {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function mapMemoTree(
  value: unknown,
  mapper: (memo: Memo) => Memo | null,
): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => mapMemoTree(item, mapper))
      .filter((item) => item !== null);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const current = value as Record<string, unknown>;
  let target: Record<string, unknown> = current;

  if (isMemoLike(current)) {
    const mapped = mapper(current);
    if (mapped === null) return null;
    target = mapped as unknown as Record<string, unknown>;
  }

  const next: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(target)) {
    next[key] = mapMemoTree(nested, mapper);
  }

  return next;
}

function prependMemoToInfiniteData(
  data: unknown,
  optimisticMemo: Memo,
): unknown {
  if (!data || typeof data !== "object") return data;

  const maybeInfinite = data as InfiniteData<{
    data: Memo[];
    nextCursor?: unknown;
  }>;
  if (!Array.isArray(maybeInfinite.pages) || maybeInfinite.pages.length === 0)
    return data;

  const first = maybeInfinite.pages[0];
  if (!first || !Array.isArray(first.data)) return data;

  return {
    ...maybeInfinite,
    pages: [
      { ...first, data: [optimisticMemo, ...first.data] },
      ...maybeInfinite.pages.slice(1),
    ],
  };
}

export function createOptimisticMemo(
  user: User | undefined,
  payload: {
    content: string;
    visibility?: "public" | "private";
    parentId?: string | null;
  },
): Memo {
  const now = new Date().toISOString();
  const optimisticId = `optimistic-${Math.random().toString(36).slice(2)}`;

  return {
    id: optimisticId,
    content: payload.content,
    userId: user?.id || "me",
    author: {
      id: user?.id || "me",
      username: user?.username || "me",
      email: user?.email || "",
      displayName: user?.displayName,
      avatarUrl: user?.avatarUrl,
      bio: user?.bio,
      createdAt: user?.createdAt || now,
    },
    parentId: payload.parentId ?? null,
    quoteId: null,
    quotedMemo: null,
    visibility: payload.visibility ?? "public",
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    path: `/${optimisticId}/`,
    resources: [],
    replies: [],
  };
}

export function snapshotMemosCache(
  queryClient: QueryClient,
): OptimisticContext {
  return {
    snapshots: queryClient.getQueriesData({ queryKey: ["memos"] }),
  };
}

export function restoreMemosCache(
  queryClient: QueryClient,
  context?: OptimisticContext,
) {
  if (!context) return;
  context.snapshots.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

export function optimisticPrependMemo(queryClient: QueryClient, memo: Memo) {
  queryClient.setQueriesData({ queryKey: ["memos", "timeline"] }, (old) =>
    prependMemoToInfiniteData(old, memo),
  );
}

export function optimisticUpdateMemo(
  queryClient: QueryClient,
  memoId: string,
  updater: (memo: Memo) => Memo,
) {
  queryClient.setQueriesData({ queryKey: ["memos"] }, (old) =>
    mapMemoTree(old, (memo) => (memo.id === memoId ? updater(memo) : memo)),
  );
}

export function optimisticRemoveMemo(queryClient: QueryClient, memoId: string) {
  queryClient.setQueriesData({ queryKey: ["memos"] }, (old) =>
    mapMemoTree(old, (memo) => (memo.id === memoId ? null : memo)),
  );
}
