"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Task, useDeleteTask } from "@/hooks/use-tasks";
import { getErrorMessage } from "@/lib/utils";

interface TaskDeleteModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TaskDeleteModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: TaskDeleteModalProps) {
  const deleteTask = useDeleteTask();

  if (!task) return null;

  const taskKey = task.project
    ? `${task.project.key}-${task.taskNumber}`
    : `PF-${task.taskNumber}`;

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success(`Task "${task.title}" deleted`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error(getErrorMessage(error, "Failed to delete task"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-semibold">
              Delete Task
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">
              {taskKey}
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {task.title}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {task.project?.name && (
              <span className="text-muted-foreground">
                Project:{" "}
                <span className="font-medium text-foreground">
                  {task.project.name}
                </span>
              </span>
            )}
            <Badge variant="outline" className="text-[10px] uppercase">
              {task.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">
              {task.priority}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          All associated subtasks, comments, and attachments will also be
          permanently removed.
        </p>

        <DialogFooter className="mt-2 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteTask.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTask.isPending}
            className="gap-2"
          >
            {deleteTask.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {deleteTask.isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
