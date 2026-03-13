import { useState } from "react";
import { useCreateMemo } from "~/hooks/mutations/use-create-memo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useTranslation } from "react-i18next";
import type { Memo } from "~/lib/api";
import { MemoComposer } from "~/components/memo-composer";

interface ReplyDialogProps {
  memo: Memo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplyDialog({ memo, open, onOpenChange }: ReplyDialogProps) {
  const [content, setContent] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  
  const createMutation = useCreateMemo();
  const { t } = useTranslation();

  const handleSubmit = async ({ content, resourceIds }: { content: string; resourceIds: string[] }) => {
    await createMutation.mutateAsync({
      content,
      visibility: memo.visibility,
      parentId: memo.id,
      resources: resourceIds,
    });

    setContent("");
    setResetSignal((prev) => prev + 1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] min-h-[420px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t("memoCard.replyTo")} @{memo.author.username}</DialogTitle>
        </DialogHeader>

        <MemoComposer
          value={content}
          onValueChange={setContent}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          submitLabel={t("createMemo.reply")}
          submittingLabel={t("createMemo.replying")}
          placeholder={t("createMemo.replyPlaceholder")}
          height={220}
          autoFocus
          resetSignal={resetSignal}
          draftKey={`reply:${memo.id}`}
          className="border-none rounded-none"
          submitClassName="rounded-full px-6 font-bold"
          uploadButtonClassName="rounded-full"
        />
      </DialogContent>
    </Dialog>
  );
}
