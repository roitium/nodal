import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "~/lib/rpc";
import { toast } from "sonner";

type UpdateMemoData = InferRequestType<
  (typeof client.api.v1.memos)[":id"]["$patch"]
>["json"];

interface UpdateMemoParams {
  id: string;
  data: UpdateMemoData;
  successMessage?: string;
}

export function useUpdateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateMemoParams) => {
      const response = await client.api.v1.memos[":id"].$patch({
        param: { id },
        json: data,
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to update memo");
      }
      return payload;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.successMessage || "Memo updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
