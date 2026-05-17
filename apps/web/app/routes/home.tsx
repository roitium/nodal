import { useTimeline } from "~/hooks/queries/use-timeline";
import { CreateMemo } from "~/components/create-memo";
import { MemoCard } from "~/components/memo-card";
import {
  TimelineOrderToggle,
  type TimelineOrder,
} from "~/components/timeline-order-toggle";
import { Skeleton } from "~/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, Calendar, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nodal - Timeline" },
    { name: "description", content: "Capture your thoughts, anywhere, anytime." },
  ];
}

function formatLocalDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomeRoute() {
  const [searchParams] = useSearchParams();
  const dateFilter = searchParams.get("date") || undefined;
  const order: TimelineOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useTimeline({ scope: "self", date: dateFilter, order });

  const { ref, inView } = useInView();
  const { t } = useTranslation();

  const updateDateFilter = (nextDate: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("date", nextDate);
    const nextSearch = nextParams.toString();
    navigate(nextSearch ? `/?${nextSearch}` : "/");
  };

  const updateOrder = (nextOrder: TimelineOrder) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextOrder === "asc") {
      nextParams.set("order", "asc");
    } else {
      nextParams.delete("order");
    }
    const nextSearch = nextParams.toString();
    navigate(nextSearch ? `/?${nextSearch}` : "/");
  };

  const clearDateFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("date");
    const nextSearch = nextParams.toString();
    navigate(nextSearch ? `/?${nextSearch}` : "/");
  };

  const shiftDateFilter = (days: number) => {
    if (!dateFilter) return;

    const currentDate = new Date(`${dateFilter}T00:00:00`);
    if (Number.isNaN(currentDate.getTime())) return;

    currentDate.setDate(currentDate.getDate() + days);
    updateDateFilter(formatLocalDateParam(currentDate));
  };

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="stagger-fade pb-20">
      <CreateMemo />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        {dateFilter ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-sm font-medium text-primary">
            <Calendar className="h-4 w-4" />
            <span>{dateFilter}</span>
            <button 
              onClick={clearDateFilter}
              className="touch-target ml-1 rounded-full p-0.5 transition-colors hover:bg-primary/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span />
        )}
        <TimelineOrderToggle value={order} onValueChange={updateOrder} />
      </div>

      <div className="space-y-3 md:space-y-4">
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

            {dateFilter && (
              <nav
                aria-label={t("timeline.dateNavigation")}
                className="grid grid-cols-2 gap-2 pt-3 sm:flex sm:items-center sm:justify-between"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => shiftDateFilter(-1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("timeline.previousDay")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-end gap-2"
                  onClick={() => shiftDateFilter(1)}
                >
                  {t("timeline.nextDay")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
