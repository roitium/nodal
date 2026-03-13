import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { useUpload } from "~/hooks/mutations/use-upload";
import type { Resource } from "~/lib/api";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { MemoEditor } from "~/components/memo-editor";
import { cn } from "~/lib/utils";

type UploadStatus = "uploading" | "uploaded" | "failed";

interface ComposerAttachment {
  localId: string;
  filename: string;
  type: string;
  previewUrl: string;
  status: UploadStatus;
  resource?: Resource;
}

interface MemoComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (payload: { content: string; resourceIds: string[] }) => Promise<void> | void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  placeholder?: string;
  height?: number;
  hideToolbar?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  initialResources?: Resource[];
  resetSignal?: string | number;
  onAttachmentCountChange?: (count: number) => void;
  leftActions?: React.ReactNode;
  showCancel?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  className?: string;
  footerClassName?: string;
  submitClassName?: string;
  uploadButtonClassName?: string;
}

function resourceToAttachment(resource: Resource): ComposerAttachment {
  return {
    localId: `resource-${resource.id}`,
    filename: resource.filename,
    type: resource.type,
    previewUrl: resource.externalLink,
    status: "uploaded",
    resource,
  };
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isBlobUrl(url: string) {
  return url.startsWith("blob:");
}

export function MemoComposer({
  value,
  onValueChange,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  placeholder,
  height = 180,
  hideToolbar = false,
  autoFocus,
  onFocus,
  initialResources,
  resetSignal,
  onAttachmentCountChange,
  leftActions,
  showCancel = false,
  onCancel,
  cancelLabel = "Cancel",
  className,
  footerClassName,
  submitClassName,
  uploadButtonClassName,
}: MemoComposerProps) {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>(
    initialResources?.map(resourceToAttachment) ?? []
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { uploadFile } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<ComposerAttachment[]>(attachments);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    setAttachments((prev) => {
      for (const item of prev) {
        if (isBlobUrl(item.previewUrl)) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return initialResources?.map(resourceToAttachment) ?? [];
    });
  }, [initialResources, resetSignal]);

  useEffect(() => {
    onAttachmentCountChange?.(attachments.length);
  }, [attachments.length, onAttachmentCountChange]);

  useEffect(() => {
    return () => {
      for (const attachment of attachmentsRef.current) {
        if (isBlobUrl(attachment.previewUrl)) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    };
  }, []);

  const isUploadingAny = attachments.some((a) => a.status === "uploading");
  const uploadedResources = attachments
    .filter((a) => a.status === "uploaded" && a.resource)
    .map((a) => a.resource as Resource);

  const canSubmit =
    (value.trim().length > 0 || uploadedResources.length > 0) &&
    !isSubmitting &&
    !isUploadingAny;

  const previewableImages = useMemo(
    () => attachments.filter((a) => a.type.startsWith("image/") && a.status !== "failed"),
    [attachments]
  );

  const openLightbox = (localId: string) => {
    const index = previewableImages.findIndex((item) => item.localId === localId);
    if (index < 0) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleRemoveAttachment = (localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target && isBlobUrl(target.previewUrl)) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.localId !== localId);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const pending = files.map((file) => ({
      file,
      localId: createLocalId(),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));

    setAttachments((prev) => [
      ...prev,
      ...pending.map((item) => ({
        localId: item.localId,
        filename: item.file.name,
        type: item.file.type,
        previewUrl: item.previewUrl,
        status: "uploading" as UploadStatus,
      })),
    ]);

    await Promise.all(
      pending.map(async (item) => {
        try {
          const resource = await uploadFile(item.file);
          setAttachments((prev) =>
            prev.map((a) => {
              if (a.localId !== item.localId) return a;
              if (isBlobUrl(a.previewUrl)) {
                URL.revokeObjectURL(a.previewUrl);
              }
              return {
                ...a,
                status: "uploaded",
                previewUrl: resource.externalLink,
                resource,
                type: resource.type,
                filename: resource.filename,
              };
            })
          );
        } catch {
          setAttachments((prev) =>
            prev.map((a) =>
              a.localId === item.localId
                ? {
                    ...a,
                    status: "failed",
                  }
                : a
            )
          );
        }
      })
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      content: value,
      resourceIds: uploadedResources.map((r) => r.id),
    });
  };

  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground overflow-hidden", className)}>
      <div className="p-2" onClick={onFocus}>
        <MemoEditor
          value={value}
          onChange={onValueChange}
          preview="edit"
          height={height}
          hideToolbar={hideToolbar}
          onSubmitShortcut={handleSubmit}
          canSubmitShortcut={canSubmit}
          autoFocus={autoFocus}
          placeholder={placeholder}
          textareaProps={{
            onFocus,
          }}
        />
      </div>

      {attachments.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {attachments.map((attachment) => {
            const isImage = attachment.type.startsWith("image/");
            return (
              <div key={attachment.localId} className="relative group">
                {isImage ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(attachment.localId)}
                    className="relative w-16 h-16 rounded-lg border shadow-sm overflow-hidden"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                    />
                    {attachment.status === "uploading" && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                    {attachment.status === "failed" && (
                      <div className="absolute inset-0 bg-destructive/20 border border-destructive flex items-center justify-center text-[10px] text-destructive font-medium">
                        Failed
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="relative w-16 h-16 flex items-center justify-center bg-muted rounded-lg border shadow-sm text-[10px] text-center break-all p-1">
                    <span>{attachment.filename}</span>
                    {attachment.status === "uploading" && (
                      <Loader2 className="absolute top-1 right-1 w-3 h-3 animate-spin text-primary" />
                    )}
                    {attachment.status === "failed" && (
                      <span className="absolute bottom-1 left-1 right-1 text-destructive font-medium">Failed</span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.localId)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={cn("flex justify-between items-center border-t border-border/50 px-4 py-3 bg-muted/30", footerClassName)}>
        <div className="flex items-center gap-2">
          {leftActions}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-9 w-9 bg-background", uploadButtonClassName)}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            {isUploadingAny ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
        </div>

        <div className="flex items-center gap-2">
          {showCancel && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" size="sm" onClick={handleSubmit} className={cn("gap-2", submitClassName)} disabled={!canSubmit}>
            <Send className="w-4 h-4" />
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={previewableImages.map((img) => ({ src: img.previewUrl }))}
      />
    </div>
  );
}
