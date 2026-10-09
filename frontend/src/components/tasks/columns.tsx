"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowUpDown,
  Calendar,
  Check,
  Copy,
  CornerDownRight,
  Eye,
  FolderKanban,
  Layers,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task } from "@/hooks/use-tasks";

import { TaskDeleteModal } from "./task-delete-modal";

const statusColors: Record<string, string> = {
  TODO: "outline",
  IN_PROGRESS: "warning",
  IN_REVIEW: "info",
  DONE: "success",
  BACKLOG: "secondary",
};

const priorityColors: Record<string, string> = {
  URGENT: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "info",
  NONE: "secondary",
};

function TaskTitleCell({ task }: { task: Task }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const labels = task.taskLabels || [];

  return (
    <>
      <div className="flex items-center space-x-2">
        {task.parentTask && (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 font-sans text-[10px] font-medium text-primary"
            title={`Subtask of ${task.parentTask.title}`}
          >
            <CornerDownRight className="size-3" />
            <span>Subtask</span>
          </span>
        )}
        <Button
          type="button"
          variant="link"
          onClick={() => setDetailOpen(true)}
          className="h-auto max-w-125 p-0 text-left font-medium text-foreground hover:text-primary hover:no-underline focus-visible:ring-0"
        >
          <span className="truncate">{task.title}</span>
        </Button>
        {labels.length > 0 && (
          <div className="flex space-x-1">
            {labels.slice(0, 2).map((l) => (
              <Badge
                key={l.label.id}
                variant="outline"
                className="px-1.5 py-0 text-[10px]"
              >
                {l.label.name}
              </Badge>
            ))}
            {labels.length > 2 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                +{labels.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      <TaskDetailDialog
        task={task}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function TaskRowActions({ task }: { task: Task }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const taskKey = task.project
    ? `${task.project.key}-${task.taskNumber}`
    : String(task.taskNumber);

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(taskKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyKey}>
            {copiedKey ? (
              <Check className="mr-2 size-4 text-emerald-500" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            {copiedKey ? "Key Copied!" : "Copy task key"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyId}>
            {copiedId ? (
              <Check className="mr-2 size-4 text-emerald-500" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            {copiedId ? "ID Copied!" : "Copy task ID"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="mr-2 size-4" />
            View details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskDetailDialog
        task={task}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <TaskDeleteModal
        task={task}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

export const columns: ColumnDef<Task>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "taskNumber",
    header: "Key",
    cell: ({ row }) => {
      const project = row.original.project;
      return (
        <span className="font-medium whitespace-nowrap text-muted-foreground">
          {project
            ? `${project.key}-${row.original.taskNumber}`
            : row.original.taskNumber}
        </span>
      );
    },
  },
  {
    id: "project",
    accessorKey: "project",
    header: "Project",
    cell: ({ row }) => {
      const project = row.original.project;
      if (!project)
        return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
          {project.color ? (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          ) : (
            <FolderKanban className="size-3.5 shrink-0 text-primary" />
          )}
          <span className="max-w-28 truncate" title={project.name}>
            {project.name}
          </span>
          <Badge
            variant="outline"
            className="px-1 py-0 font-mono text-[10px] text-muted-foreground"
          >
            {project.key}
          </Badge>
        </div>
      );
    },
    filterFn: (row, _id, value) => {
      const projectId = row.original.project?.id || row.original.projectId;
      return Array.isArray(value)
        ? value.includes(projectId)
        : value === projectId;
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Title
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row }) => <TaskTitleCell task={row.original} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            (statusColors[status] || "secondary") as React.ComponentProps<
              typeof Badge
            >["variant"]
          }
        >
          {status.replace("_", " ")}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <Badge
          variant={
            (priorityColors[priority] || "secondary") as React.ComponentProps<
              typeof Badge
            >["variant"]
          }
        >
          {priority}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "sprint",
    header: "Sprint",
    cell: ({ row }) => {
      const sprint = row.original.sprint;
      if (!sprint) {
        return (
          <span className="text-xs text-muted-foreground italic">Backlog</span>
        );
      }
      const isActive = sprint.status === "ACTIVE";
      return (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className="gap-1 px-1.5 py-0.5 text-xs font-normal"
        >
          <Layers className="size-3" />
          <span className="max-w-24 truncate">{sprint.name}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "storyPoints",
    header: "Points",
    cell: ({ row }) => {
      const pts = row.original.storyPoints;
      if (pts === null || pts === undefined || pts === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <Badge
          variant="secondary"
          className="px-1.5 py-0 font-mono text-[11px]"
        >
          {pts} pts
        </Badge>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.original.dueDate;
      if (!dueDate)
        return <span className="text-xs text-muted-foreground">—</span>;
      const date = new Date(dueDate);
      const isOverdue =
        row.original.status !== "DONE" &&
        date.getTime() < new Date().setHours(0, 0, 0, 0);

      return (
        <div
          className={`flex items-center gap-1 text-xs whitespace-nowrap ${
            isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
          }`}
        >
          <Calendar className="size-3.5" />
          <span>{format(date, "MMM d, yyyy")}</span>
          {isOverdue && (
            <span className="rounded-xs bg-destructive/10 px-1 py-0 text-[10px] font-semibold text-destructive">
              Overdue
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      if (!assignee) {
        return (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={assignee.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px]">
              {assignee.firstName[0]}
              {assignee.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            {assignee.firstName} {assignee.lastName}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const assignee = row.original.assignee;
      if (!assignee) return false;
      return value.includes(assignee.id);
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground">
          {format(new Date(row.getValue("createdAt")), "MMM d, yyyy")}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <TaskRowActions task={row.original} />,
  },
];
