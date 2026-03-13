import { useQuery } from "@tanstack/react-query";
import { authAPI } from "~/lib/api";

export function useUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const { data } = await authAPI.getMe();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
