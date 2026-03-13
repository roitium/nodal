import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI, type CreateMemoData } from "~/lib/api";
import { toast } from "sonner";
import {
  createOptimisticMemo,
  optimisticPrependMemo,
  restoreMemosCache,
  snapshotMemosCache,
} from "~/hooks/mutations/optimistic-memos";

export function useCreateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemoData) => {
      const response = await memosAPI.createMemo(data);
      return response.data;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["memos"] });

      const context = snapshotMemosCache(queryClient);
      const me = queryClient.getQueryData(["user", "me"]);
      const optimisticMemo = createOptimisticMemo(me as any, {
        content: data.content,
        visibility: data.visibility,
        parentId: data.parentId,
      });

      optimisticPrependMemo(queryClient, optimisticMemo);
      return context;
    },
    onSuccess: () => {
      toast.success("Memo created");
    },
    onError: (error: any, _variables, context) => {
      restoreMemosCache(queryClient, context);
      toast.error(error.response?.data?.message || "Failed to create memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
