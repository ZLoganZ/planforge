'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/use-tasks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  Calendar,
  Layers,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface KanbanCardProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: (task: Task) => void;
}

export function KanbanCard({ task, isOverlay = false, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT':
        return <Flame className="size-3.5 text-rose-500" />;
      case 'HIGH':
        return <ArrowUp className="size-3.5 text-amber-500" />;
      case 'MEDIUM':
        return <Minus className="size-3.5 text-yellow-500" />;
      case 'LOW':
        return <ArrowDown className="size-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  const assigneeInitials = task.assignee
    ? `${task.assignee.firstName?.[0] || ''}${task.assignee.lastName?.[0] || ''}`.toUpperCase()
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative cursor-grab touch-none transition-all duration-150 select-none active:cursor-grabbing',
        isDragging && 'scale-95 opacity-30',
        isOverlay && 'scale-105 rotate-2 cursor-grabbing shadow-2xl ring-2 ring-primary/40'
      )}
    >
      <Card
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            onClick?.(task);
          }
        }}
        className={cn(
          'cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-card py-0 transition-all hover:border-primary/40 hover:shadow-md',
          isOverlay && 'border-primary bg-card/95 backdrop-blur-md'
        )}
      >
        <CardContent className="space-y-2.5 p-3.5">
          {/* Header: Project Key + Priority + Drag handle */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                {task.project?.key ? `${task.project.key}-${task.taskNumber}` : `PF-${task.taskNumber}`}
              </span>
              {task.priority && task.priority !== 'NONE' && (
                <span className="flex items-center gap-0.5 rounded bg-muted/60 px-1 py-0.5" title={`Priority: ${task.priority}`}>
                  {getPriorityIcon(task.priority)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {task.storyPoints !== undefined && task.storyPoints !== null && (
                <Badge variant="outline" className="h-5 bg-muted/40 px-1.5 text-[10px] font-semibold">
                  {task.storyPoints} pts
                </Badge>
              )}
              <div
                className="rounded p-0.5 text-muted-foreground/40 opacity-60 transition-opacity group-hover:opacity-100 hover:text-foreground"
                title="Drag to move"
              >
                <GripVertical className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
            {task.title}
          </h4>

          {/* Labels */}
          {task.taskLabels && task.taskLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {task.taskLabels.map(({ label }) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${label.color}15`,
                    color: label.color,
                    border: `1px solid ${label.color}35`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Date, Sprint, Assignee */}
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2 overflow-hidden">
              {task.sprint && (
                <span className="flex items-center gap-1 truncate font-medium text-primary/80" title={`Sprint: ${task.sprint.name}`}>
                  <Layers className="size-3 shrink-0" />
                  <span className="max-w-20 truncate">{task.sprint.name}</span>
                </span>
              )}

              {task.dueDate && (
                <span className="flex shrink-0 items-center gap-1" title={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}>
                  <Calendar className="size-3" />
                  <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                </span>
              )}
            </div>

            {task.assignee ? (
              <Avatar className="size-5 shrink-0 ring-1 ring-border" title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.firstName} />
                <AvatarFallback className="bg-primary/20 text-[9px] font-semibold text-primary">
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">Unassigned</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
