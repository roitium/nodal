import { useQuery } from "@tanstack/react-query";
import { authAPI } from "~/lib/api";

export function useUser() {
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const { data } = await authAPI.getMe();
      return data.data;
    },
    enabled: hasToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
