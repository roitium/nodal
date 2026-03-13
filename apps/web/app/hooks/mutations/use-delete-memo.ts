import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI } from "~/lib/api";
import { toast } from "sonner";

export function useDeleteMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await memosAPI.deleteMemo(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
      toast.success("Memo deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete memo");
    },
  });
}
