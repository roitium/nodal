import { useEffect } from "react";
import { MemoCard } from "~/components/memo-card";
import { Skeleton } from "~/components/ui/skeleton";
import { useTimeline } from "~/hooks/queries/use-timeline";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/explore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nodal - Explore" },
    { name: "description", content: "Explore public memos from all users." },
  ];
}

export default function ExploreRoute() {
  const { t } = useTranslation();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useTimeline({ scope: "explore" });
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="pb-20 space-y-4">
      <h1 className="text-xl font-semibold">{t("sidebar.explore")}</h1>

      {status === "pending" ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4 border-b border-border/50">
            <Skeleton className="h-10 w-10 rounded-full shrink-0 mt-1" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-3 w-[90px]" />
              </div>
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[78%]" />
            </div>
          </div>
        ))
      ) : status === "error" ? (
        <div className="text-center text-destructive p-4">{t("timeline.error")}</div>
      ) : (
        <>
          {data.pages.map((page, i) => (
            <div key={i}>
              {page.data.map((memo) => (
                <MemoCard key={memo.id} memo={memo} />
              ))}
            </div>
          ))}

          {hasNextPage && (
            <div ref={ref} className="flex justify-center pt-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!hasNextPage && data.pages[0]?.data.length > 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {t("timeline.noMore")}
            </div>
          )}

          {!hasNextPage && data.pages[0]?.data.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {t("timeline.empty")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
