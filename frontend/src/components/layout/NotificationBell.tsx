"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Play,
  RefreshCw,
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
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 10,
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const notifications = (notificationsData?.items || []) as NotificationItem[];

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

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead.mutate(item.id);
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
        className="w-80 border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:w-96"
      >
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

        <div className="max-h-95 divide-y divide-border/40 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 size-5 animate-spin opacity-50" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted/50">
                <BellOff className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;re completely caught up!
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-accent/40",
                  !item.isRead && "bg-primary/5"
                )}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs">
                  {getIcon(item.type)}
                </div>
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
                    {!item.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  {item.message && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.message}
                    </p>
                  )}
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
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
