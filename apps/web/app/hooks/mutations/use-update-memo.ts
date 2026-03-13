import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI, type UpdateMemoData } from "~/lib/api";
import { toast } from "sonner";
import {
  optimisticUpdateMemo,
  restoreMemosCache,
  snapshotMemosCache,
} from "~/hooks/mutations/optimistic-memos";

interface UpdateMemoParams {
  id: string;
  data: UpdateMemoData;
  successMessage?: string;
}

export function useUpdateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateMemoParams) => {
      const response = await memosAPI.updateMemo(id, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["memos"] });
      const context = snapshotMemosCache(queryClient);

      optimisticUpdateMemo(queryClient, id, (memo) => ({
        ...memo,
        content: data.content ?? memo.content,
        visibility: data.visibility ?? memo.visibility,
        isPinned: data.isPinned ?? memo.isPinned,
      }));

      return context;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.successMessage || "Memo updated");
    },
    onError: (error: any, _variables, context) => {
      restoreMemosCache(queryClient, context);
      toast.error(error.response?.data?.message || "Failed to update memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
