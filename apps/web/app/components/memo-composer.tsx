import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { useUpload } from "~/hooks/mutations/use-upload";
import type { Resource } from "~/lib/api";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { MemoEditor } from "~/components/memo-editor";
import { cn } from "~/lib/utils";
import { useLightboxHistory } from "~/hooks/use-lightbox-history";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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
  onBlurOutside?: () => void;
  onFocusInside?: () => void;
  draftKey?: string;
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

const ASPECT_OPTIONS: Array<{ key: string; label: string; value?: number }> = [
  { key: "free", label: "Free" },
  { key: "square", label: "1:1", value: 1 },
  { key: "portrait", label: "4:5", value: 4 / 5 },
  { key: "landscape", label: "4:3", value: 4 / 3 },
  { key: "wide", label: "16:9", value: 16 / 9 },
];

function getCenteredCrop(mediaWidth: number, mediaHeight: number, aspect?: number): Crop {
  if (!aspect) {
    return {
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    };
  }

  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

async function cropWithCanvas(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  sourceFile: File,
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.floor(pixelCrop.width * scaleX));
  const height = Math.max(1, Math.floor(pixelCrop.height * scaleY));
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceFile;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    width,
    height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, sourceFile.type || "image/jpeg", 0.95);
  });

  if (!blob) return sourceFile;

  return new File([blob], sourceFile.name, {
    type: sourceFile.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

interface CropSession {
  file: File;
  imageUrl: string;
  resolve: (file: File) => void;
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
  onBlurOutside,
  onFocusInside,
  draftKey,
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
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [crop, setCrop] = useState<Crop>({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const { uploadFile } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const attachmentsRef = useRef<ComposerAttachment[]>(attachments);
  const cropSessionRef = useRef<CropSession | null>(null);
  const loadedDraftRef = useRef(false);
  const pointerDownInsideRef = useRef(false);
  const { closeWithHistory } = useLightboxHistory(lightboxOpen, setLightboxOpen);
  const { t } = useTranslation();

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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      pointerDownInsideRef.current = !!(target && rootRef.current?.contains(target));
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
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

  useEffect(() => {
    if (!draftKey || loadedDraftRef.current) return;
    loadedDraftRef.current = true;

    if (value.trim().length > 0) return;

    const cached = localStorage.getItem(`memo-composer:${draftKey}`);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached) as { content?: string };
      if (parsed.content) {
        onValueChange(parsed.content);
      }
    } catch {
      localStorage.removeItem(`memo-composer:${draftKey}`);
    }
  }, [draftKey, onValueChange, value]);

  useEffect(() => {
    if (!draftKey) return;

    const key = `memo-composer:${draftKey}`;

    if (!value.trim()) {
      localStorage.removeItem(key);
      return;
    }

    const timer = window.setTimeout(() => {
      localStorage.setItem(
        key,
        JSON.stringify({
          content: value,
          updatedAt: Date.now(),
        })
      );
    }, 200);

    return () => window.clearTimeout(timer);
  }, [draftKey, value]);

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

  const finishCropSession = (file: File) => {
    const session = cropSessionRef.current;
    if (!session) return;

    session.resolve(file);
    URL.revokeObjectURL(session.imageUrl);
    cropSessionRef.current = null;
    setCropDialogOpen(false);
    setCropImageUrl(null);
    setCompletedCrop(undefined);
    setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
  };

  const requestCroppedFile = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    return await new Promise((resolve) => {
      const imageUrl = URL.createObjectURL(file);
      cropSessionRef.current = { file, imageUrl, resolve };
      setCropImageUrl(imageUrl);
      setCompletedCrop(undefined);
      setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
      setCropDialogOpen(true);
    });
  };

  const handleCropApply = async () => {
    const session = cropSessionRef.current;
    const image = cropImageRef.current;
    if (!session || !image) return;

    if (!completedCrop?.width || !completedCrop.height) {
      finishCropSession(session.file);
      return;
    }

    const croppedFile = await cropWithCanvas(image, completedCrop, session.file);
    finishCropSession(croppedFile);
  };

  const handleCropSkip = () => {
    const session = cropSessionRef.current;
    if (!session) return;
    finishCropSession(session.file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const filesWithCrop: File[] = [];
    for (const file of files) {
      filesWithCrop.push(await requestCroppedFile(file));
    }

    const pending = filesWithCrop.map((file) => ({
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

    if (draftKey) {
      localStorage.removeItem(`memo-composer:${draftKey}`);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("rounded-xl border bg-card text-card-foreground overflow-hidden", className)}
      onFocusCapture={onFocusInside}
      onBlurCapture={(e) => {
        const nextTarget = e.relatedTarget as Node | null;
        if (nextTarget && rootRef.current?.contains(nextTarget)) return;
        if (!nextTarget && pointerDownInsideRef.current) return;

        const nextElement = nextTarget as HTMLElement | null;
        if (nextElement?.closest("[data-radix-popper-content-wrapper]")) return;

        onBlurOutside?.();
      }}
    >
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
                        {t("common.failed")}
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
                      <span className="absolute bottom-1 left-1 right-1 text-destructive font-medium">{t("common.failed")}</span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.localId)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm"
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
          <Button type="button" size="sm" onClick={handleSubmit} className={cn("gap-2", submitClassName)} disabled={!canSubmit}>
            <Send className="w-4 h-4" />
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={closeWithHistory}
        index={lightboxIndex}
        slides={previewableImages.map((img) => ({ src: img.previewUrl }))}
        controller={{ closeOnBackdropClick: true }}
      />

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          if (!open && cropSessionRef.current) {
            handleCropSkip();
            return;
          }
          setCropDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{t("createMemo.cropTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative max-h-[60vh] overflow-auto rounded-xl border bg-muted/20 p-3">
              {cropImageUrl && (
                <ReactCrop
                  crop={crop}
                  onChange={(nextCrop) => setCrop(nextCrop)}
                  onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
                  aspect={cropAspect}
                  minWidth={40}
                  minHeight={40}
                >
                  <img
                    src={cropImageUrl}
                    alt="crop"
                    ref={cropImageRef}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      setCrop(getCenteredCrop(image.width, image.height, cropAspect));
                    }}
                  />
                </ReactCrop>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("createMemo.cropAspect")}</p>
              <div className="flex flex-wrap gap-2">
                {ASPECT_OPTIONS.map((option) => {
                  const selected = cropAspect === option.value || (!option.value && !cropAspect);
                  return (
                    <Button
                      key={option.key}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCropAspect(option.value);
                        const image = cropImageRef.current;
                        if (image) {
                          setCrop(getCenteredCrop(image.width, image.height, option.value));
                        }
                      }}
                    >
                      {option.value ? option.label : t("createMemo.cropAspectFree")}
                    </Button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t("createMemo.cropHint")}</p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCropSkip}>
                {t("createMemo.cropSkip")}
              </Button>
              <Button type="button" onClick={handleCropApply}>
                {t("createMemo.cropApply")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
