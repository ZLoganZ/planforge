"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Play,
  RefreshCw,
  Trash2,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  NotificationItem,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { useUpdateTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    new Set()
  );

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 20,
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const updateTask = useUpdateTask();

  const notifications = (notificationsData?.items || []) as NotificationItem[];

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <UserCheck className="size-4 text-emerald-400" />;
      case "TASK_UPDATED":
        return <RefreshCw className="size-4 text-sky-400" />;
      case "TASK_COMMENTED":
        return <MessageSquare className="size-4 text-amber-400" />;
      case "SPRINT_STARTED":
        return <Play className="size-4 text-indigo-400" />;
      case "SPRINT_COMPLETED":
        return <CheckCircle2 className="size-4 text-purple-400" />;
      default:
        return <Bell className="size-4 text-primary" />;
    }
  };

  const handleNavigate = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead.mutate(item.id);
    }
    setOpen(false);

    const data = item.data as { taskId?: string; projectId?: string } | null;

    if (data?.taskId) {
      if (data.projectId) {
        router.push(`/board?taskId=${data.taskId}&projectId=${data.projectId}`);
      } else {
        router.push(`/board?taskId=${data.taskId}`);
      }
      return;
    }

    if (item.type === "IMPORT_COMPLETED") {
      router.push("/import");
      return;
    }

    if (item.type === "SPRINT_STARTED" || item.type === "SPRINT_COMPLETED") {
      router.push("/sprints");
      return;
    }
  };

  const handleCompleteTask = async (
    e: React.MouseEvent,
    item: NotificationItem,
    taskId: string
  ) => {
    e.stopPropagation();
    try {
      await updateTask.mutateAsync({ id: taskId, status: "DONE" });
      setCompletedTaskIds((prev) => new Set(prev).add(taskId));
      if (!item.isRead) {
        markAsRead.mutate(item.id);
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:w-105"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="flex h-7 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2.5 text-xs font-medium transition-all",
              filter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilter("all")}
          >
            All ({notifications.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2.5 text-xs font-medium transition-all",
              filter === "unread"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {/* List */}
        <div className="max-h-100 divide-y divide-border/40 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 size-5 animate-spin opacity-50" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted/50">
                <BellOff className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {filter === "unread"
                  ? "You have completed and read all your updates!"
                  : "You're completely caught up!"}
              </p>
              {filter === "unread" && notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 text-xs"
                  onClick={() => setFilter("all")}
                >
                  View all notifications
                </Button>
              )}
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const data = item.data as {
                taskId?: string;
                projectId?: string;
              } | null;
              const isTaskDone =
                data?.taskId && completedTaskIds.has(data.taskId);

              return (
                <div
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-accent/40",
                    !item.isRead && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs">
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "truncate text-xs font-semibold",
                          item.isRead ? "text-foreground/80" : "text-foreground"
                        )}
                      >
                        {item.title}
                      </p>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1">
                        {!item.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground opacity-60 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate(item.id);
                          }}
                          disabled={markAsRead.isPending}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          title="Dismiss notification"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(item.id);
                          }}
                          disabled={deleteNotification.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {item.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.message}
                      </p>
                    )}

                    {/* Interactive Action Bar */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {data?.taskId && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px] font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(item);
                            }}
                          >
                            <ExternalLink className="size-3" />
                            View Task
                          </Button>

                          {isTaskDone ? (
                            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Task Done
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[11px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                              onClick={(e) =>
                                handleCompleteTask(e, item, data.taskId!)
                              }
                              disabled={updateTask.isPending}
                            >
                              <CheckCircle2 className="size-3" />
                              Complete Task
                            </Button>
                          )}
                        </>
                      )}

                      {item.type === "IMPORT_COMPLETED" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[11px] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(item);
                          }}
                        >
                          <ExternalLink className="size-3" />
                          View Tasks
                        </Button>
                      )}

                      {(item.type === "SPRINT_STARTED" ||
                        item.type === "SPRINT_COMPLETED") && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[11px] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(item);
                          }}
                        >
                          <ExternalLink className="size-3" />
                          View Sprints
                        </Button>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                      <Clock className="size-3" />
                      <span>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
