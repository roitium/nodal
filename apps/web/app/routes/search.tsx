import { useState } from "react";
import { useSearchMemos } from "~/hooks/queries/use-timeline";
import { MemoCard } from "~/components/memo-card";
import { Input } from "~/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { useDebounce } from "~/hooks/use-debounce";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/search";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Search Memos - Nodal" },
    { name: "description", content: "Search your memos." },
  ];
}

export default function SearchRoute() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { t } = useTranslation();

  const { data: memos, isFetching, status } = useSearchMemos(debouncedSearchTerm);

  return (
    <div className="space-y-6 pb-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      <div className="space-y-4">
        {isFetching ? (
          Array.from({ length: 3 }).map((_, i) => (
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
          ))
        ) : debouncedSearchTerm === "" ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {t("search.emptyKeyword")}
          </div>
        ) : status === "error" ? (
          <div className="text-center text-destructive p-4">{t("search.error")}</div>
        ) : memos?.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {t("search.noResult", { keyword: debouncedSearchTerm })}
          </div>
        ) : (
          memos?.map((memo) => <MemoCard key={memo.id} memo={memo} />)
        )}
      </div>
    </div>
  );
}
