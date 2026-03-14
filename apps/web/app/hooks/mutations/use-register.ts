import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "~/lib/rpc";
import { toast } from "sonner";
import { useNavigate } from "react-router";

type RegisterData = InferRequestType<
  (typeof client.api.v1.auth.register)["$post"]
>["json"];

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await client.api.v1.auth.register.$post({ json: data });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Registration failed");
      }
      return payload;
    },
    onSuccess: (data) => {
      if (!data.data) {
        toast.error("Registration failed");
        return;
      }
      localStorage.setItem("token", data.data.token);
      queryClient.setQueryData(["user", "me"], data.data.user);
      toast.success("Registration successful");
      navigate("/");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Registration failed");
    },
  });
}
