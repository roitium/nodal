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
      <div className="p-4 flex items-center justify-center">
        <Skeleton className="w-full h-[100px]" />
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
    <div className="w-full overflow-hidden px-4 pb-2">
      <div className="text-xs text-muted-foreground mb-2 font-medium">
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
            light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
            dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
          }}
          labels={{
            legend: {
              less: t("heatmap.less") || "Less",
              more: t("heatmap.more") || "More",
            },
            months: [
              t("heatmap.months.jan") || "Jan",
              t("heatmap.months.feb") || "Feb",
              t("heatmap.months.mar") || "Mar",
              t("heatmap.months.apr") || "Apr",
              t("heatmap.months.may") || "May",
              t("heatmap.months.jun") || "Jun",
              t("heatmap.months.jul") || "Jul",
              t("heatmap.months.aug") || "Aug",
              t("heatmap.months.sep") || "Sep",
              t("heatmap.months.oct") || "Oct",
              t("heatmap.months.nov") || "Nov",
              t("heatmap.months.dec") || "Dec",
            ],
            weekdays: [
              t("heatmap.weekdays.sun") || "Sun",
              t("heatmap.weekdays.mon") || "Mon",
              t("heatmap.weekdays.tue") || "Tue",
              t("heatmap.weekdays.wed") || "Wed",
              t("heatmap.weekdays.thu") || "Thu",
              t("heatmap.weekdays.fri") || "Fri",
              t("heatmap.weekdays.sat") || "Sat",
            ],
          }}
          renderBlock={(block, activity) => (
            <Tooltip key={activity.date}>
              <TooltipTrigger asChild>
                {React.cloneElement(block, {
                  onClick: () => navigate(`/?date=${activity.date}`),
                  className: "cursor-pointer hover:stroke-foreground/50 transition-colors",
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
