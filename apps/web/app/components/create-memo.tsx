import { useState } from "react";
import { useCreateMemo } from "~/hooks/mutations/use-create-memo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Lock, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { MemoComposer } from "~/components/memo-composer";

export function CreateMemo() {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  
  const createMutation = useCreateMemo();
  const { t } = useTranslation();

  const handleSubmit = async ({ content, resourceIds }: { content: string; resourceIds: string[] }) => {
    await createMutation.mutateAsync({
      content,
      visibility,
      resources: resourceIds,
    });

    setContent("");
    setIsFocused(false);
    setResetSignal((prev) => prev + 1);
  };

  const isActive = isFocused || content.length > 0 || attachmentCount > 0;

  return (
    <div 
      className={cn(
        "mb-8 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 overflow-hidden",
        isActive ? "ring-2 ring-primary/20" : "hover:border-primary/50"
      )}
      onClick={() => setIsFocused(true)}
    >
      <MemoComposer
        value={content}
        onValueChange={setContent}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel={t("createMemo.post")}
        submittingLabel={t("createMemo.posting")}
        placeholder={t("createMemo.placeholder")}
        height={isActive ? 200 : 80}
        hideToolbar={!isActive}
        onFocusInside={() => setIsFocused(true)}
        onBlurOutside={() => {
          if (content.trim().length === 0 && attachmentCount === 0) {
            setIsFocused(false);
          }
        }}
        onAttachmentCountChange={setAttachmentCount}
        resetSignal={resetSignal}
        draftKey="create"
        leftActions={
          <Select
            value={visibility}
            onValueChange={(val: "public" | "private") => setVisibility(val)}
          >
            <SelectTrigger className="w-[120px] h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{t("createMemo.public")}</span>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span>{t("createMemo.private")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        }
        footerClassName={isActive ? undefined : "hidden"}
        submitClassName={isActive ? undefined : "hidden"}
        uploadButtonClassName={isActive ? undefined : "hidden"}
        className={cn("border-none shadow-none", !isActive && "memo-composer-collapsed")}
      />
    </div>
  );
}
