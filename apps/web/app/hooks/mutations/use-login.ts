import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI, type LoginData } from "~/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await authAPI.login(data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.data.token);
      queryClient.setQueryData(["user", "me"], data.data.user);
      toast.success("Login successful");
      navigate("/");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
}
