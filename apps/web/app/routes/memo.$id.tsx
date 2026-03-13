import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { memosAPI } from "~/lib/api";
import { MemoCard } from "~/components/memo-card";
import { Skeleton } from "~/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTimeline } from "~/hooks/queries/use-timeline";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { ReplyDialog } from "~/components/reply-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/memo.$id";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Memo - Nodal" },
  ];
}

export default function MemoDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isReplying, setIsReplying] = useState(false);
  const { t } = useTranslation();

  // Fetch the main memo
  const { data: memoResponse, isLoading: isLoadingMemo, isError } = useQuery({
    queryKey: ["memos", "detail", id],
    queryFn: async () => {
      const { data } = await memosAPI.getMemo(id as string);
      return data.data;
    },
    enabled: !!id,
  });

  const memo = memoResponse;

  // Fetch replies
  const {
    data: repliesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: repliesStatus,
  } = useTimeline({ parentId: id });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoadingMemo) {
    return (
      <div className="pb-20">
        <div className="flex items-center gap-4 mb-4 px-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="border border-border/50 rounded-xl bg-card overflow-hidden mb-6 shadow-sm">
          <div className="flex gap-3 p-4 border-b border-border/50">
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
          <div className="p-4 border-t border-border/50 bg-muted/20">
            <Skeleton className="h-10 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !memo) {
    return (
      <div className="text-center p-8 text-destructive">
        {t("memoDetail.loadError")}
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center gap-4 mb-4 px-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">{t("memoDetail.title")}</h1>
      </div>

      <div className="border border-border/50 rounded-xl bg-card overflow-hidden mb-6 shadow-sm">
        <MemoCard memo={memo} isDetail={true} />
        
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground bg-background rounded-full h-10"
            onClick={() => setIsReplying(true)}
          >
            {t("memoDetail.postReply")}
          </Button>
        </div>
      </div>

      <div className="space-y-0">
        {repliesStatus === "pending" ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 border-b border-border/50">
                <Skeleton className="h-10 w-10 rounded-full shrink-0 mt-1" />
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-[130px]" />
                    <Skeleton className="h-3 w-[90px]" />
                  </div>
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {repliesData?.pages.map((page, i) => (
              <div key={i}>
                {page.data.map((reply) => (
                  <MemoCard key={reply.id} memo={reply} />
                ))}
              </div>
            ))}
            
            {hasNextPage && (
              <div ref={ref} className="flex justify-center pt-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!hasNextPage && (repliesData?.pages[0]?.data?.length ?? 0) > 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {t("memoDetail.noMoreReplies")}
              </div>
            )}
          </>
        )}
      </div>

      <ReplyDialog 
        memo={memo} 
        open={isReplying} 
        onOpenChange={setIsReplying} 
      />
    </div>
  );
}
