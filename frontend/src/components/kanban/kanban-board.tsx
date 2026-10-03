"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  closestCorners,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Filter, Plus, RefreshCw, Search } from "lucide-react";

import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useSprints } from "@/hooks/use-sprints";
import { Task, useReorderTasks, useTask, useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

import { KanbanCardOverlay } from "./kanban-card";
import { ColumnDefinition, KanbanColumn } from "./kanban-column";
import { TaskDetailDialog } from "./task-detail-dialog";

const COLUMNS: ColumnDefinition[] = [
  { id: "BACKLOG", title: "Backlog", color: "slate", dotColor: "bg-slate-400" },
  { id: "TODO", title: "To Do", color: "blue", dotColor: "bg-blue-500" },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    color: "amber",
    dotColor: "bg-amber-500",
  },
  {
    id: "IN_REVIEW",
    title: "In Review",
    color: "purple",
    dotColor: "bg-purple-500",
  },
  { id: "DONE", title: "Done", color: "emerald", dotColor: "bg-emerald-500" },
];

interface KanbanBoardProps {
  initialProjectId?: string;
}

export function KanbanBoard({ initialProjectId }: KanbanBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const taskIdParam = searchParams.get("taskId");
  const { data: paramTask } = useTask(taskIdParam || "");

  const currentProjectId = projectIdParam || initialProjectId || "all";
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] =
    useState<Task | null>(null);
  const [quickAddStatus, setQuickAddStatus] = useState<string | null>(null);

  const handleProjectChange = (newProjectId: string) => {
    setSelectedSprintId("all");
    const params = new URLSearchParams(searchParams.toString());
    if (newProjectId === "all") {
      params.delete("projectId");
    } else {
      params.set("projectId", newProjectId);
    }
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl);
  };

  const { data: projectsData } = useProjects();
  const projects = Array.isArray(projectsData?.items) ? projectsData.items : [];

  const effectiveProjectId =
    currentProjectId !== "all" ? currentProjectId : undefined;

  const { data: sprints } = useSprints({
    projectId: effectiveProjectId,
  });
  const sprintList = Array.isArray(sprints) ? sprints : [];

  const {
    data: tasksData,
    isLoading,
    isFetching,
    refetch,
  } = useTasks({
    limit: 100,
    projectId: effectiveProjectId,
    sprintId: selectedSprintId !== "all" ? selectedSprintId : undefined,
  });

  const reorderTasks = useReorderTasks();

  const activeDetailTask = useMemo(() => {
    if (selectedTaskForDetail) return selectedTaskForDetail;
    if (paramTask) return paramTask;
    if (taskIdParam && tasksData?.items) {
      return (
        (tasksData.items as Task[]).find((t) => t.id === taskIdParam) || null
      );
    }
    return null;
  }, [selectedTaskForDetail, paramTask, taskIdParam, tasksData]);

  // Local drag state for optimistic column reordering during DnD
  const [dragColumns, setDragColumns] = useState<Record<string, Task[]> | null>(
    null
  );

  const derivedColumns = useMemo(() => {
    const rawTasks = Array.isArray(tasksData?.items) ? tasksData.items : [];
    let filtered = rawTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          `${t.project?.key}-${t.taskNumber}`.toLowerCase().includes(q)
      );
    }

    if (selectedPriority !== "all") {
      filtered = filtered.filter((t) => t.priority === selectedPriority);
    }

    const grouped: Record<string, Task[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };

    filtered.forEach((task) => {
      const statusKey = task.status in grouped ? task.status : "TODO";
      grouped[statusKey].push(task);
    });

    // Sort each column by position
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return grouped;
  }, [tasksData, searchQuery, selectedPriority]);

  const boardColumns = dragColumns || derivedColumns;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // 1. Point-in-rect check: fast and prevents cross-column jumping
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // 2. Intersection fallback
    const intersections = rectIntersection(args);
    if (intersections.length > 0) {
      return intersections;
    }
    return closestCorners(args);
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskForDetail(task);
  }, []);

  const handleQuickAdd = useCallback((status: string) => {
    setQuickAddStatus(status);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const activeId = active.id as string;
      const current = dragColumns || derivedColumns;

      let foundTask: Task | undefined;

      for (const [, list] of Object.entries(current)) {
        const match = list.find((t) => t.id === activeId);
        if (match) {
          foundTask = match;
          break;
        }
      }

      setDragColumns(current);
      if (foundTask) {
        setActiveTask(foundTask);
      }
    },
    [dragColumns, derivedColumns]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      setDragColumns((prev) => {
        const current = prev || derivedColumns;

        let activeColumn: string | undefined;
        let overColumn: string | undefined;

        for (const [colId, list] of Object.entries(current)) {
          if (!activeColumn && list.some((t) => t.id === activeId)) {
            activeColumn = colId;
          }
          if (!overColumn) {
            if (colId === overId) {
              overColumn = colId;
            } else if (list.some((t) => t.id === overId)) {
              overColumn = colId;
            }
          }
          if (activeColumn && overColumn) break;
        }

        if (!activeColumn || !overColumn) {
          return prev;
        }

        // Case 1: Reordering within the SAME column
        if (activeColumn === overColumn) {
          const colList = current[activeColumn];
          const activeIndex = colList.findIndex((t) => t.id === activeId);
          const overIndex = colList.findIndex((t) => t.id === overId);

          if (
            activeIndex !== -1 &&
            overIndex !== -1 &&
            activeIndex !== overIndex
          ) {
            return {
              ...current,
              [activeColumn]: arrayMove(colList, activeIndex, overIndex),
            };
          }
          return prev;
        }

        // Case 2: Moving from activeColumn into a DIFFERENT overColumn
        const sourceList = current[activeColumn];
        const targetList = current[overColumn];

        const taskIndex = sourceList.findIndex((t) => t.id === activeId);
        if (taskIndex === -1) return prev;

        const movedTask = { ...sourceList[taskIndex], status: overColumn };
        const nextSource = sourceList.filter((t) => t.id !== activeId);

        const overIndex = targetList.findIndex((t) => t.id === overId);
        const nextTarget = [...targetList];
        if (overIndex >= 0) {
          nextTarget.splice(overIndex, 0, movedTask);
        } else {
          nextTarget.push(movedTask);
        }

        return {
          ...current,
          [activeColumn]: nextSource,
          [overColumn]: nextTarget,
        };
      });
    },
    [derivedColumns]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) {
        setDragColumns(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;
      const current = dragColumns || derivedColumns;

      let targetCol: string | undefined;
      for (const [colId, list] of Object.entries(current)) {
        if (
          colId === overId ||
          list.some((t) => t.id === overId || t.id === activeId)
        ) {
          targetCol = colId;
          break;
        }
      }

      if (!targetCol) {
        setDragColumns(null);
        return;
      }

      let targetList = [...(current[targetCol] || [])];

      const activeIndex = targetList.findIndex((t) => t.id === activeId);
      const overIndex = targetList.findIndex((t) => t.id === overId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        targetList = arrayMove(targetList, activeIndex, overIndex);
      } else if (activeIndex === -1) {
        const activeTaskObj = active.data.current?.task as Task | undefined;
        const movedTask = activeTaskObj
          ? { ...activeTaskObj, status: targetCol }
          : ({ id: activeId, status: targetCol } as Task);

        if (overIndex >= 0) {
          targetList.splice(overIndex, 0, movedTask);
        } else {
          targetList.push(movedTask);
        }
      }

      const itemsToUpdate = targetList.map((task, idx) => ({
        id: task.id,
        position: idx,
        status: targetCol,
      }));

      reorderTasks.mutate(itemsToUpdate, {
        onSettled: () => setDragColumns(null),
      });
    },
    [dragColumns, derivedColumns, reorderTasks]
  );

  const currentProjectIdForCreation =
    effectiveProjectId || (projects.length > 0 ? projects[0].id : undefined);

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Board Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-xs">
        <div className="flex min-w-70 flex-1 flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search board..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          {/* Project Filter */}
          <Select value={currentProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sprint Filter */}
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All Sprints" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sprints</SelectItem>
              {sprintList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.status === "ACTIVE" ? "🟢" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <Filter className="mr-1 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 gap-1.5 px-2.5 text-xs"
            title="Refresh board"
          >
            <RefreshCw
              className={cn("size-3.5", isFetching && "animate-spin")}
            />
          </Button>

          <TaskCreateModal projectId={currentProjectIdForCreation}>
            <Button size="sm" className="h-9 gap-1.5 text-xs shadow-sm">
              <Plus className="size-4" />
              New Task
            </Button>
          </TaskCreateModal>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <div key={c.id} className="w-76 shrink-0 space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-6">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={boardColumns[col.id] || []}
                onTaskClick={handleTaskClick}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 150,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={activeDetailTask}
        open={Boolean(activeDetailTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskForDetail(null);
            if (taskIdParam) {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("taskId");
              const newUrl = params.toString()
                ? `${pathname}?${params.toString()}`
                : pathname;
              router.replace(newUrl);
            }
          }
        }}
      />

      {/* Quick Add Modal */}
      {quickAddStatus && (
        <TaskCreateModal
          projectId={currentProjectIdForCreation}
          defaultStatus={quickAddStatus}
          open={Boolean(quickAddStatus)}
          onOpenChange={(open) => {
            if (!open) setQuickAddStatus(null);
          }}
        />
      )}
    </div>
  );
}
