import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI } from "~/lib/api";
import { toast } from "sonner";
import {
  optimisticRemoveMemo,
  restoreMemosCache,
  snapshotMemosCache,
} from "~/hooks/mutations/optimistic-memos";

export function useDeleteMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await memosAPI.deleteMemo(id);
      return response.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["memos"] });
      const context = snapshotMemosCache(queryClient);
      optimisticRemoveMemo(queryClient, id);
      return context;
    },
    onSuccess: () => {
      toast.success("Memo deleted");
    },
    onError: (error: any, _variables, context) => {
      restoreMemosCache(queryClient, context);
      toast.error(error.response?.data?.message || "Failed to delete memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
