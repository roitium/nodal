import { useEffect } from "react";
import { MemoCard } from "~/components/memo-card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  TimelineOrderToggle,
  type TimelineOrder,
} from "~/components/timeline-order-toggle";
import { useTimeline } from "~/hooks/queries/use-timeline";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/explore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nodal - Explore" },
    { name: "description", content: "Explore public memos from all users." },
  ];
}

export default function ExploreRoute() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const order: TimelineOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useTimeline({ scope: "explore", order });
  const { ref, inView } = useInView();

  const updateOrder = (nextOrder: TimelineOrder) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextOrder === "asc") {
      nextParams.set("order", "asc");
    } else {
      nextParams.delete("order");
    }
    const nextSearch = nextParams.toString();
    navigate(nextSearch ? `/explore?${nextSearch}` : "/explore");
  };

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="stagger-fade space-y-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="app-heading text-2xl font-semibold">{t("sidebar.explore")}</h1>
        <TimelineOrderToggle value={order} onValueChange={updateOrder} />
      </div>

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
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
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
