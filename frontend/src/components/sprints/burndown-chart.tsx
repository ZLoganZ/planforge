import React from "react";
import { Info, Layers, Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSprintBurndown } from "@/hooks/use-analytics";

interface BurndownChartProps {
  sprintId: string;
}

export function BurndownChart({ sprintId }: BurndownChartProps) {
  const { data, isLoading } = useSprintBurndown(sprintId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !data.points || data.points.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
        <Layers className="size-8 opacity-40" />
        <p className="text-xs">No burndown data available for this sprint.</p>
      </div>
    );
  }

  const { sprint, points } = data;
  const completedPoints =
    sprint.completedPoints ??
    sprint.totalPoints -
      (points.findLast((p) => p.actual !== null)?.actual ?? sprint.totalPoints);
  const remainingPoints =
    sprint.remainingPoints ?? Math.max(0, sprint.totalPoints - completedPoints);
  const percentComplete =
    sprint.totalPoints > 0
      ? Math.round((completedPoints / sprint.totalPoints) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Total Scope
          </p>
          <p className="text-lg font-bold text-foreground">
            {sprint.totalPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              pts
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Completed
          </p>
          <p className="text-lg font-bold text-emerald-500">
            {completedPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              pts
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Remaining
          </p>
          <p className="text-lg font-bold text-sky-500">
            {remainingPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              pts
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Burn Progress
          </p>
          <p className="text-lg font-bold text-foreground">
            {percentComplete}%
          </p>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              vertical={false}
            />
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-[11px]"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-[11px]"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as (typeof points)[0];
                return (
                  <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
                    <p className="font-semibold text-foreground">
                      {label} ({point.date})
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-slate-400" />
                          Ideal Remaining:
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {point.ideal} pts
                        </span>
                      </div>
                      {point.actual !== null && (
                        <div className="flex items-center justify-between gap-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Actual Remaining:
                          </span>
                          <span className="font-mono font-medium text-emerald-500">
                            {point.actual} pts
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
            />
            <Line
              type="monotone"
              name="Ideal Guide"
              dataKey="ideal"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              name="Actual Remaining"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10b981" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="size-3.5 shrink-0 text-muted-foreground" />
        The ideal line descends linearly from starting scope to zero. Real
        burndown plots actual uncompleted story points across sprint days.
      </p>
    </div>
  );
}
