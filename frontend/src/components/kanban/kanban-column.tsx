"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import React, { useMemo } from "react";
import { KanbanCard } from "./kanban-card";

export interface ColumnDefinition {
  id: string;
  title: string;
  color: string;
  dotColor: string;
}

interface KanbanColumnProps {
  column: ColumnDefinition;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onQuickAdd?: (status: string) => void;
}

export const KanbanColumn = React.memo(function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const totalPoints = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    [tasks],
  );

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-76 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/40 p-3 transition-colors",
        isOver && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      {/* Column Header */}
      <div className="mb-1 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", column.dotColor)}
          />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {column.title}
          </h3>
          <Badge
            variant="secondary"
            className="h-5 rounded-full px-1.5 text-xs font-semibold"
          >
            {tasks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {totalPoints > 0 && (
            <span
              className="mr-1 text-[11px] font-medium text-muted-foreground"
              title="Total Story Points"
            >
              {totalPoints} pts
            </span>
          )}
          {onQuickAdd && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onQuickAdd(column.id)}
              title={`Add task to ${column.title}`}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Cards list with sortable context */}
      <SortableContext
        items={taskIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
          ))}

          {tasks.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground/60 select-none">
              <span>Drop tasks here</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
});
