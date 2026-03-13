import { QueryClient } from '@tanstack/react-query'
import { get, set, del } from 'idb-keyval'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (increased for better persistence)
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 (Auth errors)
        if (error?.response?.status === 401 || error?.response?.status === 403) return false
        return failureCount < 3
      },
    },
  },
})

export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery') {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey)
    },
    removeClient: async () => {
      await del(idbValidKey)
    },
  } as Persister
}

export const persister = createIDBPersister()