import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { memosAPI, type MemoParams } from "~/lib/api";

type Cursor = { createdAt: string; id: string } | undefined;

export function useTimeline(params?: MemoParams) {
  return useInfiniteQuery({
    queryKey: ["memos", "timeline", params],
    initialPageParam: undefined as Cursor,
    queryFn: async ({ pageParam }) => {
      const { data } = await memosAPI.getTimeline({
        ...params,
        cursorCreatedAt: pageParam?.createdAt,
        cursorId: pageParam?.id,
      });
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
      const { data } = await memosAPI.searchMemos(keyword);
      return data.data;
    },
    enabled: !!keyword,
  });
}
