import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "~/lib/rpc";
import { toast } from "sonner";

export function useDeleteMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.v1.memos[":id"].$delete({
        param: { id },
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to delete memo");
      }
      return payload;
    },
    onSuccess: () => {
      toast.success("Memo deleted");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete memo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
