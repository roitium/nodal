import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { toast } from "sonner";
import { client } from "~/lib/rpc";

type UpdateProfileData = InferRequestType<
  (typeof client.api.v1.auth.me)["$patch"]
>["json"];

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfileData) => {
      const response = await client.api.v1.auth.me.$patch({ json: payload });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to update profile");
      }
      return data.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["user", "me"], user);
      toast.success("Profile updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update profile");
    },
  });
}
