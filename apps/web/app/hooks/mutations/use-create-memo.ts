import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memosAPI, type CreateMemoData } from "~/lib/api";
import { toast } from "sonner";

export function useCreateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemoData) => {
      const response = await memosAPI.createMemo(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Memo created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
