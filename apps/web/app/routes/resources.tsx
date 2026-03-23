import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { useResources, type Resource } from "~/hooks/queries/use-resources";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { FileImage, FileText, File, ExternalLink, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GroupedResources {
  [date: string]: Resource[];
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "昨天";
  } else {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) {
    return <FileImage className="h-6 w-6 text-muted-foreground" />;
  } else if (type.startsWith("text/")) {
    return <FileText className="h-6 w-6 text-muted-foreground" />;
  }
  return <File className="h-6 w-6 text-muted-foreground" />;
}

interface ResourceContextMenuProps {
  resource: Resource;
  children: React.ReactNode;
}

function ResourceContextMenu({ resource, children }: ResourceContextMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleViewMemo = useCallback(() => {
    if (resource.memoId) {
      navigate(`/memo/${resource.memoId}`);
    }
    setOpen(false);
  }, [navigate, resource.memoId]);

  const handleOpenOriginal = useCallback(() => {
    window.open(resource.externalLink, "_blank");
    setOpen(false);
  }, [resource.externalLink]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setOpen(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const isImage = resource.type.startsWith("image/");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
      <DropdownMenuContent align="start" className="w-48">
        {resource.memoId && (
          <>
            <DropdownMenuItem onClick={handleViewMemo}>
              <FolderOpen className="mr-2 h-4 w-4" />
              查看所在 Memo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleOpenOriginal}>
          <ExternalLink className="mr-2 h-4 w-4" />
          打开原图
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ResourceGridItemProps {
  resource: Resource;
}

function ResourceGridItem({ resource }: ResourceGridItemProps) {
  const isImage = resource.type.startsWith("image/");

  if (isImage) {
    return (
      <ResourceContextMenu resource={resource}>
        <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted">
          <img
            src={resource.externalLink}
            alt={resource.filename}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        </div>
      </ResourceContextMenu>
    );
  }

  return (
    <ResourceContextMenu resource={resource}>
      <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted p-4">
        <div className="flex h-full flex-col items-center justify-center gap-2">
          {getFileIcon(resource.type)}
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {resource.filename}
          </span>
        </div>
      </div>
    </ResourceContextMenu>
  );
}

export default function ResourcesPage() {
  const { data: resources, isLoading, error } = useResources();
  const { t } = useTranslation();

  const groupedResources = useMemo(() => {
    if (!resources) return {};

    const grouped: GroupedResources = {};
    resources.forEach((resource) => {
      const date = resource.createdAt.split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(resource);
    });

    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    );
  }, [resources]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
              {[...Array(6)].map((_, j) => (
                <Skeleton key={j} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">加载失败，请稍后重试</p>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <FileImage className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">还没有添加任何资源</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">资源库</h1>
        <span className="text-sm text-muted-foreground">
          共 {resources.length} 个资源
        </span>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedResources).map(([date, dateResources]) => (
          <section key={date} className="space-y-3">
            <h2 className="sticky top-14 z-10 -mx-3 bg-background/95 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4 sm:px-4">
              {formatDateHeader(date)}
              <span className="ml-2 text-xs text-muted-foreground/70">
                {dateResources.length} 个资源
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
              {dateResources.map((resource) => (
                <ResourceGridItem key={resource.id} resource={resource} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
