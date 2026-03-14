import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "~/lib/rpc";
import { toast } from "sonner";

type CreateMemoData = InferRequestType<
  (typeof client.api.v1.memos.publish)["$post"]
>["json"];

export function useCreateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemoData) => {
      const response = await client.api.v1.memos.publish.$post({ json: data });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to create memo");
      }
      return payload;
    },
    onSuccess: () => {
      toast.success("Memo created");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
