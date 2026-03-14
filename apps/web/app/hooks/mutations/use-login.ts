import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "~/lib/rpc";
import { toast } from "sonner";
import { useNavigate } from "react-router";

type LoginData = InferRequestType<
  (typeof client.api.v1.auth.login)["$post"]
>["json"];

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await client.api.v1.auth.login.$post({ json: data });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Login failed");
      }
      return payload;
    },
    onSuccess: (data) => {
      if (!data.data) {
        toast.error("Login failed");
        return;
      }
      localStorage.setItem("token", data.data.token);
      queryClient.setQueryData(["user", "me"], data.data.user);
      toast.success("Login successful");
      navigate("/");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Login failed");
    },
  });
}
