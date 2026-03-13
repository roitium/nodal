import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI, type RegisterData } from "~/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await authAPI.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.data.token);
      queryClient.setQueryData(["user", "me"], data.data.user);
      toast.success("Registration successful");
      navigate("/");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Registration failed");
    },
  });
}
