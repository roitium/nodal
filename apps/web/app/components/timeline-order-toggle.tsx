import { ArrowDownUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type TimelineOrder = "asc" | "desc";

interface TimelineOrderToggleProps {
  value: TimelineOrder;
  onValueChange: (value: TimelineOrder) => void;
  className?: string;
}

export function TimelineOrderToggle({
  value,
  onValueChange,
  className,
}: TimelineOrderToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/70 bg-muted/35 p-1",
        className,
      )}
    >
      <Button
        type="button"
        variant={value === "desc" ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={value === "desc"}
        onClick={() => onValueChange("desc")}
        className="h-8 px-2.5 text-xs md:text-sm"
      >
        <ArrowDownUp className="h-3.5 w-3.5" />
        {t("timeline.newestFirst")}
      </Button>
      <Button
        type="button"
        variant={value === "asc" ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={value === "asc"}
        onClick={() => onValueChange("asc")}
        className="h-8 px-2.5 text-xs md:text-sm"
      >
        <ArrowDownUp className="h-3.5 w-3.5 rotate-180" />
        {t("timeline.oldestFirst")}
      </Button>
    </div>
  );
}
