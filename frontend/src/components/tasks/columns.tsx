'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Task } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusColors: Record<string, string> = {
  TODO: 'outline',
  IN_PROGRESS: 'warning',
  IN_REVIEW: 'info',
  DONE: 'success',
  BACKLOG: 'secondary',
};

const priorityColors: Record<string, string> = {
  URGENT: 'destructive',
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'info',
  NONE: 'secondary',
};

export const columns: ColumnDef<Task>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
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
    accessorKey: 'taskNumber',
    header: 'Key',
    cell: ({ row }) => {
      const project = row.original.project;
      return (
        <span className="font-medium whitespace-nowrap text-muted-foreground">
          {project.key}-{row.original.taskNumber}
        </span>
      );
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Title
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const labels = row.original.taskLabels;
      return (
        <div className="flex space-x-2">
          <span className="max-w-125 truncate font-medium">
            {row.getValue('title')}
          </span>
          {labels.length > 0 && (
            <div className="flex space-x-1">
              {labels.slice(0, 2).map((l) => (
                <Badge key={l.label.id} variant="outline" className="px-1.5 py-0 text-[10px]">
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
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={(statusColors[status] || 'secondary') as React.ComponentProps<typeof Badge>['variant']}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string;
      return (
        <Badge variant={(priorityColors[priority] || 'secondary') as React.ComponentProps<typeof Badge>['variant']}>
          {priority}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      if (!assignee) {
        return <span className="text-sm text-muted-foreground">Unassigned</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={assignee.avatarUrl || ''} />
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
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground">
          {format(new Date(row.getValue('createdAt')), 'MMM d, yyyy')}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const task = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(task.id)}
            >
              Copy task ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit task</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
