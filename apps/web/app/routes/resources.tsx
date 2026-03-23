import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useResources, type Resource } from "~/hooks/queries/use-resources";
import { Skeleton } from "~/components/ui/skeleton";
import { FileImage, FileText, File } from "lucide-react";
import { useTranslation } from "react-i18next";
import Lightbox, { useLightboxState, IconButton, createIcon } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { useLightboxHistory } from "~/hooks/use-lightbox-history";

interface GroupedResources {
  [date: string]: Resource[];
}

const ViewMemoIcon = createIcon(
  "ViewMemo",
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM6 20V4h5v7h7v9H6z" />
);

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

interface ViewMemoButtonProps {
  onNavigate: (memoId: string) => void;
}

function ViewMemoButton({ onNavigate }: ViewMemoButtonProps) {
  const { currentSlide } = useLightboxState();
  const memoId = currentSlide?.memoId as string | undefined;

  return (
    <IconButton
      label="查看所在 Memo"
      icon={ViewMemoIcon}
      disabled={!memoId}
      onClick={() => {
        if (memoId) {
          onNavigate(memoId);
        }
      }}
    />
  );
}

interface ResourceGridItemProps {
  resource: Resource;
  onClick: () => void;
}

function ResourceGridItem({ resource, onClick }: ResourceGridItemProps) {
  const isImage = resource.type.startsWith("image/");

  if (isImage) {
    return (
      <div
        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted"
        onClick={onClick}
      >
        <img
          src={resource.externalLink}
          alt={resource.filename}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </div>
    );
  }

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted p-4"
      onClick={onClick}
    >
      <div className="flex h-full flex-col items-center justify-center gap-2">
        {getFileIcon(resource.type)}
        <span className="max-w-full truncate text-xs text-muted-foreground">
          {resource.filename}
        </span>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const { data: resources, isLoading, error } = useResources();
  const { t } = useTranslation();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { closeWithHistory } = useLightboxHistory(lightboxOpen, setLightboxOpen);

  const imageResources = useMemo(() => {
    return resources?.filter((r) => r.type.startsWith("image/")) || [];
  }, [resources]);

  const lightboxSlides = useMemo(() => {
    return imageResources.map((resource) => ({
      src: resource.externalLink,
      alt: resource.filename,
      memoId: resource.memoId,
    }));
  }, [imageResources]);

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

  const handleImageClick = useCallback((resource: Resource) => {
    const index = imageResources.findIndex((r) => r.id === resource.id);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  }, [imageResources]);

  const handleNavigateToMemo = useCallback((memoId: string) => {
    setLightboxOpen(false);
    navigate(`/memo/${memoId}`);
  }, [navigate]);

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
                <ResourceGridItem
                  key={resource.id}
                  resource={resource}
                  onClick={() => handleImageClick(resource)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={closeWithHistory}
        index={lightboxIndex}
        slides={lightboxSlides}
        controller={{ closeOnBackdropClick: true }}
        toolbar={{
          buttons: [
            <ViewMemoButton key="view-memo" onNavigate={handleNavigateToMemo} />,
            "close",
          ],
        }}
      />
    </div>
  );
}
