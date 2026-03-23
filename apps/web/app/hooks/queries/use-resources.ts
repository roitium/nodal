import { useQuery } from "@tanstack/react-query";
import { client } from "~/lib/rpc";

export interface Resource {
  id: string;
  userId: string;
  filename: string;
  type: string;
  size: number;
  provider: string;
  path: string;
  externalLink: string;
  createdAt: string;
  memoId: string | null;
}

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const response = await client.api.v1.resources["user-all"].$get();
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch resources");
      }
      return (data.data ?? []) as Resource[];
    },
  });
}
