import { useQuery } from "@tanstack/react-query";
import { authAPI } from "~/lib/api";

export function useUserProfile(username?: string) {
  return useQuery({
    queryKey: ["user", "profile", username],
    queryFn: async () => {
      if (!username) return null;
      const { data } = await authAPI.getUserProfile(username);
      return data.data;
    },
    enabled: !!username,
  });
}
