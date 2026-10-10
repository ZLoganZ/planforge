"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers,
  Loader2,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

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

  const handleConfirmDelete = async () => {
    try {
      await bulkDelete.mutateAsync(selectedTaskIds);
      table.resetRowSelection();
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Failed to delete selected tasks:", err);
    }
  };

  const handleExportSelected = () => {
    const csvRows = [
      [
        "Key",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Project",
        "Assignee",
        "Reporter",
        "Sprint",
        "Story Points",
        "Labels",
        "Due Date",
        "Created At",
      ],
      ...selectedRows.map((r) => [
        `"${r.original.project?.key ? `${r.original.project.key}-${r.original.taskNumber}` : `PF-${r.original.taskNumber}`}"`,
        `"${(r.original.title || "").replace(/"/g, '""')}"`,
        `"${(r.original.description || "").replace(/"/g, '""')}"`,
        r.original.status,
        r.original.priority,
        `"${(r.original.project?.name || "").replace(/"/g, '""')}"`,
        `"${(r.original.assignee ? `${r.original.assignee.firstName} ${r.original.assignee.lastName}`.trim() : "Unassigned").replace(/"/g, '""')}"`,
        `"${(r.original.reporter ? `${r.original.reporter.firstName} ${r.original.reporter.lastName}`.trim() : "Unassigned").replace(/"/g, '""')}"`,
        `"${(r.original.sprint?.name || "Backlog").replace(/"/g, '""')}"`,
        r.original.storyPoints ?? "",
        `"${(r.original.taskLabels?.map((tl) => tl.label.name).join(", ") || "").replace(/"/g, '""')}"`,
        r.original.dueDate
          ? new Date(r.original.dueDate).toISOString().split("T")[0]
          : "",
        r.original.createdAt
          ? new Date(r.original.createdAt).toISOString()
          : "",
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `planforge-selected-tasks-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Export Selected */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportSelected}
          disabled={isPending}
          className="h-8 gap-1.5 bg-card text-xs"
        >
          <Download className="size-3.5 text-muted-foreground" />
          Export CSV
        </Button>

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteConfirmOpen(true)}
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

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Delete {selectedCount} {selectedCount === 1 ? "Task" : "Tasks"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Are you sure you want to delete {selectedCount}{" "}
                {selectedCount === 1 ? "task" : "tasks"}? This action cannot be
                undone.
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-2 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={bulkDelete.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={bulkDelete.isPending}
              className="gap-2"
            >
              {bulkDelete.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {bulkDelete.isPending ? "Deleting..." : "Delete Tasks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
