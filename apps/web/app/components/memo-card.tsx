import React, { useState } from "react";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { MoreHorizontal, Pin, Lock, Globe, Trash2, Edit, MessageCircle } from "lucide-react";
import type { Memo } from "~/lib/api";
import { useDeleteMemo } from "~/hooks/mutations/use-delete-memo";
import { useUpdateMemo } from "~/hooks/mutations/use-update-memo";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { useUser } from "~/hooks/queries/use-user";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ReplyDialog } from "./reply-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { MemoComposer } from "~/components/memo-composer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useLightboxHistory } from "~/hooks/use-lightbox-history";
import { markdownComponents, markdownRehypePlugins, markdownRemarkPlugins } from "~/lib/markdown";

interface MemoCardProps {
  memo: Memo;
  isDetail?: boolean;
}

export function MemoCard({ memo, isDetail = false }: MemoCardProps) {
  const { data: currentUser } = useUser();
  const deleteMutation = useDeleteMemo();
  const updateMutation = useUpdateMemo();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const dateLocale = i18n.language.startsWith('zh') ? zhCN : enUS;
  const createdAt = new Date(memo.createdAt);
  const isWithinOneDay = differenceInHours(new Date(), createdAt) < 24;
  const displayTime = isWithinOneDay
    ? formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })
    : format(createdAt, "yyyy-MM-dd HH:mm");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(memo.visibility);
  const [isReplying, setIsReplying] = useState(false);
  const [editResetSignal, setEditResetSignal] = useState(0);
  const { closeWithHistory } = useLightboxHistory(lightboxOpen, setLightboxOpen);

  const isOwner = currentUser?.id === memo.userId;
  const imageResources = memo.resources?.filter((r) => r.type.startsWith("image/")) || [];
  const canSaveEdit =
    editContent.trim().length > 0 &&
    !updateMutation.isPending;
  
  // @ts-ignore - subReplyCount is injected by backend extras
  const replyCount = memo.replies?.length || memo.subReplyCount || 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("memoCard.confirmDelete"))) {
      deleteMutation.mutate(memo.id);
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({
      id: memo.id,
      data: { isPinned: !memo.isPinned },
      successMessage: memo.isPinned ? t("memoCard.unpin") : t("memoCard.pin"),
    });
  };

  const handleSaveEdit = async ({
    content,
    resourceIds,
  }: {
    content: string;
    resourceIds: string[];
  }) => {
    if (!content.trim()) {
      setIsEditing(false);
      return;
    }

    await updateMutation.mutateAsync({
      id: memo.id,
      data: { content, visibility: editVisibility, resources: resourceIds },
      successMessage: t("memoCard.saveChanges"),
    });
    setIsEditing(false);
  };

  const openLightbox = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCardClick = () => {
    if (!isDetail) {
      navigate(`/memo/${memo.id}`);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/u/${memo.author.username}`);
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`surface-card interactive-lift mb-3 flex gap-3 rounded-2xl p-3.5 md:p-4 ${!isDetail ? 'cursor-pointer hover:bg-accent/25' : ''}`}
      >
        <div className="shrink-0 pt-0.5">
          <button type="button" onClick={handleAuthorClick} className="touch-target rounded-full">
            <Avatar className="w-10 h-10">
              <AvatarImage src={memo.author.avatarUrl} />
              <AvatarFallback>{memo.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-sm leading-5">
              <button
                type="button"
                onClick={handleAuthorClick}
                className="font-bold text-foreground hover:text-primary"
              >
                {memo.author.displayName || memo.author.username}
              </button>
              <button
                type="button"
                onClick={handleAuthorClick}
                className="text-muted-foreground hover:text-foreground"
              >
                @{memo.author.username}
              </button>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {displayTime}
              </span>
              
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 text-muted-foreground/70">
                      {memo.visibility === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {memo.visibility === "private" ? t("createMemo.private") : t("createMemo.public")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {memo.isPinned && <Pin className="ml-1 h-3.5 w-3.5 text-primary" />}
            </div>
            
            {isOwner && (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="touch-target -mr-1 -mt-1 h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/65 hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditContent(memo.content);
                        setEditVisibility(memo.visibility);
                        setEditResetSignal((prev) => prev + 1);
                        setIsEditing(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t("memoCard.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTogglePin}>
                      <Pin className="w-4 h-4 mr-2" />
                      {memo.isPinned ? t("memoCard.unpin") : t("memoCard.pin")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("memoCard.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className={`prose dark:prose-invert max-w-none wrap-break-word prose-p:leading-6 prose-a:text-primary ${isDetail ? 'prose-base' : 'prose-sm'}`}>
            <ReactMarkdown
              components={markdownComponents as any}
              rehypePlugins={markdownRehypePlugins as any}
              remarkPlugins={markdownRemarkPlugins as any}
            >
              {memo.content}
            </ReactMarkdown>
          </div>
          
          {imageResources.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 pr-0 sm:pr-2 md:pr-4">
              {imageResources.map((resource, index) => (
                <button
                  key={resource.id}
                  type="button"
                  className="interactive-lift overflow-hidden rounded-xl border border-border/70 bg-muted/20"
                  onClick={(e) => openLightbox(e, index)}
                >
                  <img
                    src={resource.externalLink}
                    alt={resource.filename}
                    className="h-auto max-h-80 w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-5 text-muted-foreground">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsReplying(true);
              }}
              className="group flex min-h-10 items-center gap-1.5 rounded-full pr-2 text-sm transition-colors hover:text-primary"
            >
              <div className="rounded-full p-1.5 transition-colors group-hover:bg-primary/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              {replyCount > 0 && <span>{replyCount}</span>}
            </button>
          </div>
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={closeWithHistory}
        index={lightboxIndex}
        slides={imageResources.map((img) => ({ src: img.externalLink }))}
        controller={{ closeOnBackdropClick: true }}
      />

      <Dialog
        open={isEditing}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditContent(memo.content);
            setEditVisibility(memo.visibility);
            setEditResetSignal((prev) => prev + 1);
          }
          setIsEditing(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("memoCard.editMemo")}</DialogTitle>
          </DialogHeader>

          <MemoComposer
            value={editContent}
            onValueChange={setEditContent}
            onSubmit={handleSaveEdit}
            isSubmitting={updateMutation.isPending}
            submitLabel={t("memoCard.saveChanges")}
            submittingLabel={t("memoCard.saving")}
            placeholder={t("createMemo.placeholder")}
            height={300}
            initialResources={memo.resources || []}
            resetSignal={`${memo.id}-${editResetSignal}-${isEditing ? "open" : "closed"}`}
            leftActions={
              <Select
                value={editVisibility}
                onValueChange={(val: "public" | "private") => setEditVisibility(val)}
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
            className="border-none"
          />
        </DialogContent>
      </Dialog>

      <ReplyDialog 
        memo={memo} 
        open={isReplying} 
        onOpenChange={setIsReplying} 
      />
    </>
  );
}
