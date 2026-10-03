"use client";

import * as React from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Inbox,
  Layers,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { KanbanCard, KanbanCardOverlay } from "@/components/kanban/kanban-card";
import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { SprintModal } from "@/components/sprints/sprint-modal";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import {
  Sprint,
  useCompleteSprint,
  useDeleteSprint,
  useSprints,
  useStartSprint,
} from "@/hooks/use-sprints";
import { Task, useReorderTasks, useTasks } from "@/hooks/use-tasks";

export default function SprintsPage() {
  const { data: projectsData } = useProjects();
  const projects = React.useMemo(
    () => projectsData?.items || [],
    [projectsData?.items]
  );

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [selectedSprintId, setSelectedSprintId] = React.useState<string>("");
  const [sprintModalOpen, setSprintModalOpen] = React.useState(false);
  const [sprintToEdit, setSprintToEdit] = React.useState<Sprint | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] =
    React.useState<Task | null>(null);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const defaultProject =
    projects.find((p) => (p._count?.tasks ?? 0) > 0) || projects[0];
  const effectiveProjectId = selectedProjectId || defaultProject?.id || "";

  const { data: sprints, isLoading: isLoadingSprints } = useSprints({
    projectId: effectiveProjectId || undefined,
  });
  const sprintList = React.useMemo(
    () => (Array.isArray(sprints) ? sprints : []),
    [sprints]
  );

  const activeSprint = sprintList.find((s) => s.status === "ACTIVE");
  const effectiveSprintId =
    selectedSprintId && sprintList.some((s) => s.id === selectedSprintId)
      ? selectedSprintId
      : activeSprint?.id || sprintList[0]?.id || "";

  const selectedSprint = sprintList.find((s) => s.id === effectiveSprintId);

  // Fetch all tasks for this project
  const { data: allTasksData, isLoading: isLoadingTasks } = useTasks({
    projectId: effectiveProjectId || undefined,
    limit: 100,
  });

  const reorderTasks = useReorderTasks();
  const startSprint = useStartSprint();
  const completeSprint = useCompleteSprint();
  const deleteSprint = useDeleteSprint();

  const allTasks = Array.isArray(allTasksData?.items) ? allTasksData.items : [];

  // Split tasks into Backlog (no sprintId or sprintId not matching selectedSprint) and Selected Sprint
  const backlogTasks = allTasks.filter((t) => !t.sprintId);
  const sprintTasks = allTasks.filter((t) => t.sprintId === effectiveSprintId);

  const backlogPoints = backlogTasks.reduce(
    (acc, t) => acc + (t.storyPoints || 0),
    0
  );
  const sprintTotalPoints = sprintTasks.reduce(
    (acc, t) => acc + (t.storyPoints || 0),
    0
  );
  const sprintCompletedPoints = sprintTasks
    .filter((t) => t.status === "DONE")
    .reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const progressPercent =
    sprintTotalPoints > 0
      ? Math.round((sprintCompletedPoints / sprintTotalPoints) * 100)
      : 0;

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overTarget = over.id as string;

    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const isCurrentlyInSprint = task.sprintId === effectiveSprintId;

    if (
      overTarget === "sprint-droppable" &&
      !isCurrentlyInSprint &&
      effectiveSprintId
    ) {
      // Move to sprint
      reorderTasks.mutate([
        {
          id: taskId,
          position: sprintTasks.length,
          sprintId: effectiveSprintId,
        },
      ]);
    } else if (overTarget === "backlog-droppable" && isCurrentlyInSprint) {
      // Move to backlog
      reorderTasks.mutate([
        {
          id: taskId,
          position: backlogTasks.length,
          sprintId: null,
        },
      ]);
    }
  };

  const handleMoveToSprint = (taskId: string) => {
    if (!effectiveSprintId) return;
    reorderTasks.mutate([
      {
        id: taskId,
        position: sprintTasks.length,
        sprintId: effectiveSprintId,
      },
    ]);
  };

  const handleRemoveFromSprint = (taskId: string) => {
    reorderTasks.mutate([
      {
        id: taskId,
        position: backlogTasks.length,
        sprintId: null,
      },
    ]);
  };

  const handleStartSprint = async () => {
    if (!effectiveSprintId) return;
    await startSprint.mutateAsync(effectiveSprintId);
  };

  const handleCompleteSprint = async () => {
    if (!effectiveSprintId) return;
    if (
      confirm("Complete this sprint? Unfinished tasks can remain or be moved.")
    ) {
      await completeSprint.mutateAsync(effectiveSprintId);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (
      confirm("Delete this sprint? All tasks will be returned to the backlog.")
    ) {
      await deleteSprint.mutateAsync(sprintId);
    }
  };

  const openCreateSprintModal = () => {
    setSprintToEdit(null);
    setSprintModalOpen(true);
  };

  const openEditSprintModal = (sprint: Sprint) => {
    setSprintToEdit(sprint);
    setSprintModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-5">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                Sprint Planning
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Plan sprint capacity, organize team commitments, and drag tasks
              between backlog and sprint.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Picker */}
            <Select
              value={effectiveProjectId}
              onValueChange={(val) => {
                setSelectedProjectId(val);
                setSelectedSprintId("");
              }}
            >
              <SelectTrigger className="h-9 w-52 text-xs">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={openCreateSprintModal}
              disabled={!effectiveProjectId}
              className="h-9 gap-1.5 text-xs shadow-xs"
            >
              <Plus className="size-4" />
              Create Sprint
            </Button>
          </div>
        </div>

        {/* Selected Sprint Header Card */}
        {selectedSprint ? (
          <Card className="border border-border/80 bg-linear-to-r from-card to-card/60 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedSprint.name}
                    </h3>

                    {selectedSprint.status === "ACTIVE" && (
                      <Badge className="gap-1 border border-emerald-500/30 bg-emerald-500/15 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                        ACTIVE SPRINT
                      </Badge>
                    )}
                    {selectedSprint.status === "PLANNING" && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-500"
                      >
                        PLANNING
                      </Badge>
                    )}
                    {selectedSprint.status === "COMPLETED" && (
                      <Badge variant="secondary" className="text-[11px]">
                        COMPLETED
                      </Badge>
                    )}

                    {(selectedSprint.startDate || selectedSprint.endDate) && (
                      <div className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3.5" />
                        <span>
                          {selectedSprint.startDate
                            ? format(
                                new Date(selectedSprint.startDate),
                                "MMM d"
                              )
                            : "Start"}
                          {" — "}
                          {selectedSprint.endDate
                            ? format(
                                new Date(selectedSprint.endDate),
                                "MMM d, yyyy"
                              )
                            : "End"}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedSprint.goal && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 shrink-0 text-primary" />
                      <span>{selectedSprint.goal}</span>
                    </p>
                  )}
                </div>

                {/* Metrics + Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Capacity pill */}
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">
                        {sprintTasks.length}
                      </span>{" "}
                      tasks
                      <span className="mx-1.5 text-muted-foreground/60">•</span>
                      <span className="font-semibold text-foreground">
                        {sprintCompletedPoints}/{sprintTotalPoints}
                      </span>{" "}
                      pts ({progressPercent}%)
                    </div>
                    {/* Tiny progress bar */}
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedSprint.status === "PLANNING" && (
                    <Button
                      size="sm"
                      onClick={handleStartSprint}
                      disabled={startSprint.isPending}
                      className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                    >
                      <Play className="size-3.5 fill-current" />
                      Start Sprint
                    </Button>
                  )}

                  {selectedSprint.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCompleteSprint}
                      disabled={completeSprint.isPending}
                      className="h-8 gap-1.5 border-emerald-500/40 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Complete Sprint
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditSprintModal(selectedSprint)}
                    title="Edit Sprint"
                  >
                    <Pencil className="size-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeleteSprint(selectedSprint.id)}
                    title="Delete Sprint"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Sprint selector pill tabs */}
              {sprintList.length > 1 && (
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-border/40 pt-3">
                  <span className="mr-1 shrink-0 text-[11px] text-muted-foreground">
                    Switch Sprint:
                  </span>
                  {sprintList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSprintId(s.id)}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        s.id === effectiveSprintId
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {s.name} {s.status === "ACTIVE" ? "🟢" : ""}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          !isLoadingSprints && (
            <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-dashed p-8 text-center">
              <Layers className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">
                No sprints created yet for this project
              </p>
              <Button
                size="sm"
                onClick={openCreateSprintModal}
                className="h-8 text-xs"
              >
                Create First Sprint
              </Button>
            </div>
          )
        )}

        {/* Two-Pane Backlog & Sprint Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid min-h-130 flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left Pane: Backlog */}
            <div
              id="backlog-droppable"
              className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs"
            >
              <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Project Backlog
                  </h3>
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-full px-1.5 text-xs font-semibold"
                  >
                    {backlogTasks.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {backlogPoints} pts
                  </span>
                  <TaskCreateModal
                    projectId={selectedProjectId || "global"}
                    defaultStatus="BACKLOG"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="size-3.5" />
                      Add Task
                    </Button>
                  </TaskCreateModal>
                </div>
              </div>

              {isLoadingTasks ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                  {backlogTasks.map((task) => (
                    <div key={task.id} className="group relative">
                      <KanbanCard
                        task={task}
                        onClick={(t) => setSelectedTaskForDetail(t)}
                      />
                      {effectiveSprintId && (
                        <button
                          onClick={() => handleMoveToSprint(task.id)}
                          className="absolute top-2 right-2 z-10 hidden items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-md transition-all group-hover:flex hover:bg-primary/90"
                          title="Move to Sprint"
                        >
                          Sprint <ArrowRight className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {backlogTasks.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground/60 select-none">
                      <span>Backlog is empty</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Pane: Selected Sprint Tasks */}
            <div
              id="sprint-droppable"
              className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs"
            >
              <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedSprint ? selectedSprint.name : "Sprint Scope"}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-full px-1.5 text-xs font-semibold"
                  >
                    {sprintTasks.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {sprintTotalPoints} pts
                  </span>
                  {selectedSprintId && (
                    <TaskCreateModal
                      projectId={selectedProjectId || "global"}
                      defaultStatus="TODO"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                      >
                        <Plus className="size-3.5" />
                        Add Task
                      </Button>
                    </TaskCreateModal>
                  )}
                </div>
              </div>

              {isLoadingTasks ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                  {sprintTasks.map((task) => (
                    <div key={task.id} className="group relative">
                      <KanbanCard
                        task={task}
                        onClick={(t) => setSelectedTaskForDetail(t)}
                      />
                      <button
                        onClick={() => handleRemoveFromSprint(task.id)}
                        className="absolute top-2 right-2 z-10 hidden items-center gap-1 rounded-md bg-destructive/90 px-2.5 py-1 text-[11px] font-medium text-destructive-foreground shadow-md transition-all group-hover:flex hover:bg-destructive"
                        title="Return to Backlog"
                      >
                        <ArrowLeft className="size-3" /> Backlog
                      </button>
                    </div>
                  ))}

                  {sprintTasks.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground/60 select-none">
                      <span>
                        Drag tasks from Backlog or click &quot;Sprint
                        &rarr;&quot; to plan
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DragOverlay>
            {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Task Detail Dialog */}
        <TaskDetailDialog
          task={selectedTaskForDetail}
          open={Boolean(selectedTaskForDetail)}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskForDetail(null);
          }}
        />

        {/* Sprint Create/Edit Modal */}
        <SprintModal
          open={sprintModalOpen}
          onOpenChange={setSprintModalOpen}
          projectId={effectiveProjectId}
          sprintToEdit={sprintToEdit}
        />
      </div>
    </AppLayout>
  );
}
