import { useQuery } from "@tanstack/react-query";
import { client } from "~/lib/rpc";

export function useUser() {
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await client.api.v1.auth.me.$get();
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch user");
      }
      return data.data;
    },
    enabled: hasToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
