"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isWeekend,
  subDays,
} from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns3,
  CornerDownRight,
  ListTodo,
  Loader2,
} from "lucide-react";

import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/hooks/use-projects";
import { useSprints } from "@/hooks/use-sprints";
import { Task, useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

interface ProjectTimelinePageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BAR_STYLES: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  BACKLOG: {
    bg: "bg-slate-500/20 hover:bg-slate-500/30",
    border: "border-slate-500/40",
    text: "text-slate-600 dark:text-slate-300",
  },
  TODO: {
    bg: "bg-blue-500/20 hover:bg-blue-500/30",
    border: "border-blue-500/40",
    text: "text-blue-600 dark:text-blue-300",
  },
  IN_PROGRESS: {
    bg: "bg-amber-500/20 hover:bg-amber-500/30",
    border: "border-amber-500/40",
    text: "text-amber-600 dark:text-amber-300",
  },
  IN_REVIEW: {
    bg: "bg-purple-500/20 hover:bg-purple-500/30",
    border: "border-purple-500/40",
    text: "text-purple-600 dark:text-purple-300",
  },
  DONE: {
    bg: "bg-emerald-500/20 hover:bg-emerald-500/30",
    border: "border-emerald-500/40",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  CANCELLED: {
    bg: "bg-red-500/20 hover:bg-red-500/30",
    border: "border-red-500/40",
    text: "text-red-600 dark:text-red-300",
  },
};

export default function ProjectTimelinePage({
  params,
}: ProjectTimelinePageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: sprints = [] } = useSprints({ projectId });

  const [selectedSprintId, setSelectedSprintId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [windowRange, setWindowRange] = useState<number>(21);
  const [timelineStart, setTimelineStart] = useState<Date>(() =>
    subDays(new Date(), 3)
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tasksData, isLoading: loadingTasks } = useTasks({
    projectId,
    limit: 100,
    sprintId: selectedSprintId === "all" ? undefined : selectedSprintId,
    statuses: selectedStatus === "all" ? undefined : [selectedStatus],
  });

  const tasks = tasksData?.items || [];

  // Generate array of days for timeline header and columns
  const timelineDays = useMemo(() => {
    return Array.from({ length: windowRange }, (_, i) =>
      addDays(timelineStart, i)
    );
  }, [timelineStart, windowRange]);

  const handlePrevRange = () => {
    setTimelineStart((prev) => subDays(prev, 7));
  };

  const handleNextRange = () => {
    setTimelineStart((prev) => addDays(prev, 7));
  };

  const handleToday = () => {
    setTimelineStart(subDays(new Date(), 3));
  };

  const handleTaskClick = (task: Task) => {
    setActiveTask(task);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-4">
        {/* Header and Breadcrumbs */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/projects"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Projects
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">
                {project ? `${project.name} (${project.key})` : "Project"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project ? `${project.name} Timeline` : "Project Timeline"}
              </h1>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <Link href={`/board?projectId=${projectId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Columns3 className="size-3.5" />
                Board View
              </Button>
            </Link>
            <Link href={`/tasks?projectId=${projectId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ListTodo className="size-3.5" />
                Task List
              </Button>
            </Link>
          </div>
        </div>

        {/* Timeline Controls & Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Sprint Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Sprint:
                </span>
                <Select
                  value={selectedSprintId}
                  onValueChange={setSelectedSprintId}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="All Sprints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Sprints
                    </SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Status:
                </span>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Statuses
                    </SelectItem>
                    <SelectItem value="TODO" className="text-xs">
                      To Do
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-xs">
                      In Progress
                    </SelectItem>
                    <SelectItem value="IN_REVIEW" className="text-xs">
                      In Review
                    </SelectItem>
                    <SelectItem value="DONE" className="text-xs">
                      Done
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Window Range */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  View:
                </span>
                <Select
                  value={windowRange.toString()}
                  onValueChange={(val) => setWindowRange(Number(val))}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14" className="text-xs">
                      14 Days
                    </SelectItem>
                    <SelectItem value="21" className="text-xs">
                      21 Days
                    </SelectItem>
                    <SelectItem value="30" className="text-xs">
                      30 Days
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={handleToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={handlePrevRange}
                title="Previous week"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-1 text-xs font-medium text-muted-foreground">
                {format(timelineDays[0], "MMM d")} –{" "}
                {format(timelineDays[timelineDays.length - 1], "MMM d, yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={handleNextRange}
                title="Next week"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Visualization Table / Gantt View */}
        <Card className="flex-1 overflow-hidden">
          {loadingTasks || loadingProject ? (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin text-primary" />
              Loading timeline schedule...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <CalendarIcon className="mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                No tasks scheduled
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                There are no tasks matching the selected filters. Assign due
                dates to tasks to see them plotted along the timeline schedule.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-x-auto">
              <div className="min-w-225">
                {/* Header row */}
                <div className="flex border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground">
                  {/* Task meta info column header */}
                  <div className="sticky left-0 z-20 w-72 shrink-0 border-r border-border bg-card/95 px-3 py-2.5 font-semibold text-foreground backdrop-blur">
                    Task ({tasks.length})
                  </div>

                  {/* Date Columns */}
                  <div className="flex flex-1">
                    {timelineDays.map((day) => {
                      const today = isToday(day);
                      const weekend = isWeekend(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "flex-1 border-r border-border/50 py-1.5 text-center transition-colors",
                            weekend && "bg-muted/30",
                            today && "bg-primary/10 font-bold text-primary"
                          )}
                        >
                          <div className="text-[10px] uppercase">
                            {format(day, "EEE")}
                          </div>
                          <div
                            className={cn(
                              "mx-auto flex size-5 items-center justify-center rounded-full text-[11px]",
                              today &&
                                "bg-primary font-semibold text-primary-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Task rows */}
                <div className="divide-y divide-border">
                  {tasks.map((task) => {
                    const taskCreatedAt = new Date(task.createdAt);
                    const taskDue = task.dueDate
                      ? new Date(task.dueDate)
                      : addDays(taskCreatedAt, 2);

                    // Compute start day offset and duration in days relative to timelineStart
                    const dayOffset = differenceInCalendarDays(
                      taskCreatedAt,
                      timelineStart
                    );
                    const durationDays = Math.max(
                      1,
                      differenceInCalendarDays(taskDue, taskCreatedAt) + 1
                    );

                    // Determine visible bar bounds clamped to [0, windowRange]
                    const visibleStart = Math.max(0, dayOffset);
                    const visibleEnd = Math.min(
                      windowRange,
                      dayOffset + durationDays
                    );
                    const isVisible =
                      visibleEnd > 0 && visibleStart < windowRange;

                    const leftPercent = isVisible
                      ? (visibleStart / windowRange) * 100
                      : 0;
                    const widthPercent = isVisible
                      ? Math.max(
                          2,
                          ((visibleEnd - visibleStart) / windowRange) * 100
                        )
                      : 0;

                    const styleConfig =
                      STATUS_BAR_STYLES[task.status] || STATUS_BAR_STYLES.TODO;

                    return (
                      <div
                        key={task.id}
                        className="group flex items-center transition-colors hover:bg-muted/20"
                      >
                        {/* Task identifier / name sticky cell */}
                        <div
                          onClick={() => handleTaskClick(task)}
                          className="sticky left-0 z-10 flex w-72 shrink-0 cursor-pointer items-center justify-between gap-2 border-r border-border bg-card/95 px-3 py-2 backdrop-blur group-hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {task.parentTask && (
                              <span
                                className="flex shrink-0 items-center text-primary"
                                title={`Subtask of ${task.parentTask.title}`}
                              >
                                <CornerDownRight className="size-3" />
                              </span>
                            )}
                            <span className="shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                              {task.project?.key
                                ? `${task.project.key}-${task.taskNumber}`
                                : `PF-${task.taskNumber}`}
                            </span>
                            <span className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                              {task.title}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {task.assignee && (
                              <Avatar className="size-5">
                                <AvatarImage
                                  src={task.assignee.avatarUrl || ""}
                                />
                                <AvatarFallback className="text-[9px]">
                                  {task.assignee.firstName[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-1.5 py-0 text-[9px] font-medium",
                                styleConfig.text
                              )}
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>

                        {/* Gantt Bar Area */}
                        <div className="relative flex h-9 flex-1 items-center">
                          {/* Background day grid lines */}
                          <div className="pointer-events-none absolute inset-0 flex">
                            {timelineDays.map((day) => {
                              const weekend = isWeekend(day);
                              const today = isToday(day);
                              return (
                                <div
                                  key={day.toISOString()}
                                  className={cn(
                                    "h-full flex-1 border-r border-border/40",
                                    weekend && "bg-muted/15",
                                    today && "bg-primary/5"
                                  )}
                                />
                              );
                            })}
                          </div>

                          {/* Task Bar */}
                          {isVisible ? (
                            <button
                              type="button"
                              onClick={() => handleTaskClick(task)}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              className={cn(
                                "absolute z-10 flex h-6 items-center gap-1.5 rounded-md border px-2 text-left shadow-sm transition-all",
                                styleConfig.bg,
                                styleConfig.border
                              )}
                              title={`${task.title} (${task.status}) - Due: ${
                                task.dueDate
                                  ? format(
                                      new Date(task.dueDate),
                                      "MMM d, yyyy"
                                    )
                                  : "Not set"
                              }`}
                            >
                              <span
                                className={cn(
                                  "truncate text-[11px] font-semibold",
                                  styleConfig.text
                                )}
                              >
                                {task.title}
                              </span>
                            </button>
                          ) : (
                            <span className="pl-3 text-[10px] text-muted-foreground/60 italic">
                              Outside view window
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailDialog
        task={activeTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AppLayout>
  );
}
