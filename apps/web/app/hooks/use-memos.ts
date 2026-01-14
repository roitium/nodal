import { useInfiniteQuery } from '@tanstack/react-query'
import { memosAPI } from '~/lib/api'
import type { MemoParams, ApiResponse, TimelineResponse } from '~/lib/api'

interface Cursor {
  createdAt: string
  id: string
}

export const useMemos = (params?: MemoParams) => {
  return useInfiniteQuery<ApiResponse<TimelineResponse>, Error, ApiResponse<TimelineResponse>, readonly unknown[], Cursor | undefined>({
    queryKey: ['memos', 'timeline', params || 'public'] as const,
    queryFn: async ({ pageParam }: { pageParam?: Cursor }) => {
      const cursor = pageParam ? {
        cursorCreatedAt: pageParam.createdAt,
        cursorId: pageParam.id
      } : undefined
      
      const response = await memosAPI.getTimeline({
        username: params?.username,
        ...cursor,
        limit: 20
      })
      
      return response.data
    },
    getNextPageParam: (lastPage: ApiResponse<TimelineResponse>) => {
      return lastPage.data.nextCursor ?? undefined
    },
    initialPageParam: undefined,
  })
}