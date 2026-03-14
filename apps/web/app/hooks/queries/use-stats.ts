import { useQuery } from "@tanstack/react-query";
import { client } from "~/lib/rpc";

export function useStats(username?: string) {
  return useQuery({
    queryKey: ["memos", "stats", username],
    queryFn: async () => {
      const response = await client.api.v1.memos.stats.$get({
        query: username ? { username } : {},
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch stats");
      }
      const stats = data.data ?? [];

      const statsMap = new Map(
        stats.map((stat) => [stat.date.split("T")[0], Number(stat.count)]),
      );

      const today = new Date();
      const pastYear = new Date(today);
      pastYear.setFullYear(today.getFullYear() - 1);

      const calendarData = [];
      for (let d = new Date(pastYear); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const count = statsMap.get(dateStr) || 0;
        calendarData.push({
          date: dateStr,
          count,
          level: Math.min(Math.ceil(count / 2), 4),
        });
      }

      return calendarData;
    },
  });
}
