"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { CheckCircle2, Layers, Tag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSprints } from "@/hooks/use-sprints";
import {
  Task,
  useBulkDeleteTasks,
  useBulkUpdateTasks,
} from "@/hooks/use-tasks";

interface DataTableBulkActionsProps {
  table: Table<Task>;
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();

  const selectedTaskIds = React.useMemo(
    () => selectedRows.map((r) => r.original.id),
    [selectedRows]
  );

  // Retrieve project id from selected tasks if uniform
  const projectId =
    selectedRows[0]?.original?.projectId ||
    selectedRows[0]?.original?.project?.id;
  const { data: sprints } = useSprints({ projectId });

  if (selectedCount === 0) return null;

  const handleStatusChange = async (status: string) => {
    await bulkUpdate.mutateAsync({
      taskIds: selectedTaskIds,
      status,
    });
    table.resetRowSelection();
  };

  const handlePriorityChange = async (priority: string) => {
    await bulkUpdate.mutateAsync({
      taskIds: selectedTaskIds,
      priority,
    });
    table.resetRowSelection();
  };

  const handleSprintChange = async (sprintId: string | null) => {
    await bulkUpdate.mutateAsync({
      taskIds: selectedTaskIds,
      sprintId,
    });
    table.resetRowSelection();
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${selectedCount} selected tasks?`)) {
      await bulkDelete.mutateAsync(selectedTaskIds);
      table.resetRowSelection();
    }
  };

  const isPending = bulkUpdate.isPending || bulkDelete.isPending;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-in items-center gap-3 rounded-xl border border-border/80 bg-background/95 px-4 py-2 shadow-2xl backdrop-blur-md transition-all slide-in-from-bottom-5 fade-in">
      <div className="flex items-center gap-2 border-r border-border/60 pr-3">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {selectedCount}
        </span>
        <span className="text-xs font-medium whitespace-nowrap text-foreground">
          {selectedCount === 1 ? "task selected" : "tasks selected"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 bg-card text-xs"
            >
              <CheckCircle2 className="size-3.5 text-muted-foreground" />
              Change Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">
              Select Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange("BACKLOG")}>
              Backlog
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("TODO")}>
              To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("IN_PROGRESS")}>
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("IN_REVIEW")}>
              In Review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("DONE")}>
              Done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 bg-card text-xs"
            >
              <Tag className="size-3.5 text-muted-foreground" />
              Set Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">
              Select Priority
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePriorityChange("URGENT")}>
              Urgent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("HIGH")}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("MEDIUM")}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("LOW")}>
              Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("NONE")}>
              None
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sprint Dropdown */}
        {sprints && sprints.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 bg-card text-xs"
              >
                <Layers className="size-3.5 text-muted-foreground" />
                Assign Sprint
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">
                Assign to Sprint
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSprintChange(null)}>
                None (Backlog)
              </DropdownMenuItem>
              {sprints.map((sprint) => (
                <DropdownMenuItem
                  key={sprint.id}
                  onClick={() => handleSprintChange(sprint.id)}
                >
                  {sprint.name} {sprint.status === "ACTIVE" ? "🟢" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          className="h-8 gap-1.5 text-xs shadow-xs"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.resetRowSelection()}
          className="size-8 text-muted-foreground hover:text-foreground"
          title="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
