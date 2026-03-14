import { useQuery } from "@tanstack/react-query";
import { client } from "~/lib/rpc";

export function useUserProfile(username?: string) {
  return useQuery({
    queryKey: ["user", "profile", username],
    queryFn: async () => {
      if (!username) return null;
      const response = await client.api.v1.auth.users[":username"].$get({
        param: { username },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch user profile");
      }
      return data.data;
    },
    enabled: !!username,
  });
}
