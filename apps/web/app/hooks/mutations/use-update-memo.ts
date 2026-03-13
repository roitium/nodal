import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI, type UpdateMemoData } from "~/lib/api";
import { toast } from "sonner";

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
      toast.success(variables.successMessage || "Memo updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update memo");
    },
  });
}
