import React from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { useStats } from "~/hooks/queries/use-stats";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Skeleton } from "~/components/ui/skeleton";
import { useNavigate } from "react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export function Heatmap({ username }: { username?: string }) {
  const { data: stats, isLoading } = useStats(username);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Skeleton className="h-25 w-full rounded-lg" />
      </div>
    );
  }

  // Ensure there's data for the calendar to render properly
  let calendarData = stats && stats.length > 0 
    ? stats 
    : [{ date: new Date().toISOString().split('T')[0], count: 0, level: 0 }];

  // Only show the last 140 days (approx 20 weeks) to fit within the sidebar without scrolling
  if (calendarData.length > 140) {
    calendarData = calendarData.slice(-140);
  }

  return (
    <div className="surface-card mx-3 w-auto overflow-hidden rounded-xl px-3.5 pb-2 pt-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {t("heatmap.totalCount", { count: stats?.reduce((acc, curr) => acc + curr.count, 0) || 0 })}
      </div>
      <TooltipProvider delayDuration={0}>
        <ActivityCalendar
          data={calendarData}
          colorScheme={theme === "dark" ? "dark" : "light"}
          blockSize={11}
          blockMargin={3}
          fontSize={12}
          showTotalCount={false}
          theme={{
            light: ["oklch(0.95 0.01 95)", "oklch(0.9 0.045 132)", "oklch(0.81 0.09 132)", "oklch(0.71 0.12 136)", "oklch(0.6 0.13 139)"],
            dark: ["oklch(0.27 0.01 106)", "oklch(0.37 0.05 136)", "oklch(0.47 0.09 136)", "oklch(0.56 0.11 132)", "oklch(0.65 0.12 128)"],
          }}
          labels={{
            legend: {
              less: t("heatmap.less"),
              more: t("heatmap.more"),
            },
            months: [
              t("heatmap.months.jan"),
              t("heatmap.months.feb"),
              t("heatmap.months.mar"),
              t("heatmap.months.apr"),
              t("heatmap.months.may"),
              t("heatmap.months.jun"),
              t("heatmap.months.jul"),
              t("heatmap.months.aug"),
              t("heatmap.months.sep"),
              t("heatmap.months.oct"),
              t("heatmap.months.nov"),
              t("heatmap.months.dec"),
            ],
            weekdays: [
              t("heatmap.weekdays.sun"),
              t("heatmap.weekdays.mon"),
              t("heatmap.weekdays.tue"),
              t("heatmap.weekdays.wed"),
              t("heatmap.weekdays.thu"),
              t("heatmap.weekdays.fri"),
              t("heatmap.weekdays.sat"),
            ],
          }}
          renderBlock={(block, activity) => (
            <Tooltip key={activity.date}>
              <TooltipTrigger asChild>
                {React.cloneElement(block, {
                  onClick: () => navigate(`/?date=${activity.date}`),
                  className: "cursor-pointer transition-transform [transition-timing-function:var(--ease-out-quart)] hover:scale-110 hover:stroke-foreground/45",
                })}
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>
                {activity.count} memos on {activity.date}
              </TooltipContent>
            </Tooltip>
          )}
        />
      </TooltipProvider>
    </div>
  );
}
