import { useQuery } from "@tanstack/react-query";
import { memosAPI } from "~/lib/api";

export function useStats(username?: string) {
  return useQuery({
    queryKey: ["memos", "stats", username],
    queryFn: async () => {
      const { data } = await memosAPI.getStats(username);
      
      const statsMap = new Map(data.data.map(stat => [stat.date.split("T")[0], Number(stat.count)]));
      
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
          level: Math.min(Math.ceil(count / 2), 4)
        });
      }
      
      return calendarData;
    },
  });
}
