import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "~/lib/rpc";

type TimelineQuery = InferRequestType<
  (typeof client.api.v1.memos.timeline)["$get"]
>["query"];
type MemoParams = Omit<TimelineQuery, "limit"> & { limit?: number | string };

type Cursor = { createdAt: string; id: string } | undefined;

function cleanQueryParams(params: MemoParams = {}): TimelineQuery {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = typeof value === "number" ? String(value) : value;
  }
  return query as TimelineQuery;
}

export function useTimeline(params?: MemoParams) {
  return useInfiniteQuery({
    queryKey: ["memos", "timeline", params],
    initialPageParam: undefined as Cursor,
    queryFn: async ({ pageParam }) => {
      const response = await client.api.v1.memos.timeline.$get({
        query: cleanQueryParams({
          ...(params ?? {}),
          cursorCreatedAt: pageParam?.createdAt,
          cursorId: pageParam?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch timeline");
      }
      if (!data.data) {
        throw new Error("Failed to fetch timeline");
      }
      return data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useSearchMemos(keyword: string) {
  return useQuery({
    queryKey: ["memos", "search", keyword],
    queryFn: async () => {
      if (!keyword) return [];
      const response = await client.api.v1.memos.search.$get({
        query: { keyword },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to search memos");
      }
      return data.data;
    },
    enabled: !!keyword,
  });
}
