import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authAPI, type UpdateProfileData } from "~/lib/api";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfileData) => {
      const { data } = await authAPI.updateProfile(payload);
      return data.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["user", "me"], user);
      toast.success("Profile updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });
}
