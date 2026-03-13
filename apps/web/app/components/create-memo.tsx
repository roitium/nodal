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
        "surface-card interactive-lift mb-6 overflow-hidden rounded-2xl text-card-foreground md:mb-8",
        isActive ? "ring-2 ring-primary/25" : "hover:border-primary/45"
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
        height={isActive ? 220 : 92}
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
            <SelectTrigger className="h-10 w-[128px] rounded-full bg-background/70 backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary/85" />
                  <span>{t("createMemo.public")}</span>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary/85" />
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
