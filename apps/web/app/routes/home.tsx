import { useTimeline } from "~/hooks/queries/use-timeline";
import { CreateMemo } from "~/components/create-memo";
import { MemoCard } from "~/components/memo-card";
import { Skeleton } from "~/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router";
import { Calendar, X } from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nodal - Home" },
    { name: "description", content: "Capture your thoughts, anywhere, anytime." },
  ];
}

export default function HomeRoute() {
  const [searchParams] = useSearchParams();
  const dateFilter = searchParams.get("date") || undefined;
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useTimeline({ date: dateFilter });

  const { ref, inView } = useInView();
  const { t } = useTranslation();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="pb-20">
      <CreateMemo />

      {dateFilter && (
        <div className="mb-6 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Calendar className="w-4 h-4" />
            <span>{dateFilter}</span>
            <button 
              onClick={() => navigate("/")}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
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
    </div>
  );
}
