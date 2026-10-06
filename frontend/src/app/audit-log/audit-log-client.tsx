"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Filter,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AuditLogItem,
  useAuditLogs,
  useAuditLogStats,
} from "@/hooks/use-audit-logs";
import { cn } from "@/lib/utils";

export function AuditLogClient() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: statsData } = useAuditLogStats();
  const { data, isLoading, isFetching, refetch } = useAuditLogs({
    page,
    limit: 15,
    search: search || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
  });

  const logs = (data?.items || []) as AuditLogItem[];
  const meta = data?.meta || {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case "CREATE":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            CREATE
          </Badge>
        );
      case "UPDATE":
        return (
          <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-400">
            UPDATE
          </Badge>
        );
      case "STATUS_CHANGE":
        return (
          <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-400">
            STATUS CHANGE
          </Badge>
        );
      case "DELETE":
        return (
          <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-400">
            DELETE
          </Badge>
        );
      case "ASSIGN":
        return (
          <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-400">
            ASSIGN
          </Badge>
        );
      default:
        return <Badge variant="outline">{act}</Badge>;
    }
  };

  const stats = statsData as
    | {
        totalLogs?: number;
        byAction?: Array<{ action: string; count: number }>;
        byEntity?: Array<{ entity: string; count: number }>;
      }
    | undefined;

  const totalCount = stats?.totalLogs ?? meta.totalItems;
  const statusChangesCount =
    stats?.byAction?.find((a) => a.action === "STATUS_CHANGE")?.count ?? 0;
  const createsCount =
    stats?.byAction?.find((a) => a.action === "CREATE")?.count ?? 0;
  const updatesCount =
    stats?.byAction?.find((a) => a.action === "UPDATE")?.count ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Activity className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Audit Logs & Activity
                </h1>
                <p className="text-sm text-muted-foreground">
                  Immutable security and operational trail of all workspace
                  events
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs text-muted-foreground shadow-xs">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              Live WebSocket Sync
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="h-8 gap-1.5"
            >
              <RefreshCw
                className={cn("size-3.5", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Logged Events</span>
              <Database className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {totalCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Status Transitions</span>
              <TrendingUp className="size-4 text-purple-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {statusChangesCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Created Items</span>
              <ShieldCheck className="size-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {createsCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Modifications</span>
              <Layers className="size-4 text-sky-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {updatesCount}
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by actor name, email, or entity ID..."
              className="h-9 bg-background/50 pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
            <Select
              value={action || "ALL"}
              onValueChange={(val) => {
                setAction(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-32.5 bg-background/50 text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Actions
                </SelectItem>
                <SelectItem value="CREATE" className="text-xs">
                  CREATE
                </SelectItem>
                <SelectItem value="UPDATE" className="text-xs">
                  UPDATE
                </SelectItem>
                <SelectItem value="STATUS_CHANGE" className="text-xs">
                  STATUS_CHANGE
                </SelectItem>
                <SelectItem value="DELETE" className="text-xs">
                  DELETE
                </SelectItem>
                <SelectItem value="ASSIGN" className="text-xs">
                  ASSIGN
                </SelectItem>
                <SelectItem value="COMMENT" className="text-xs">
                  COMMENT
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={entityType || "ALL"}
              onValueChange={(val) => {
                setEntityType(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-32.5 bg-background/50 text-xs">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Entities
                </SelectItem>
                <SelectItem value="Task" className="text-xs">
                  Task
                </SelectItem>
                <SelectItem value="Project" className="text-xs">
                  Project
                </SelectItem>
                <SelectItem value="Sprint" className="text-xs">
                  Sprint
                </SelectItem>
                <SelectItem value="User" className="text-xs">
                  User
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs Table / Timeline */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 size-6 animate-spin opacity-50" />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <Activity className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <h3 className="text-base font-semibold text-foreground">
                No audit logs found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasDiff = Boolean(
                  log.diff && Object.keys(log.diff).length > 0
                );
                const hasMetadata = Boolean(
                  log.metadata && Object.keys(log.metadata).length > 0
                );
                const canExpand = hasDiff || hasMetadata;

                const formatKeyName = (key: string) => {
                  const map: Record<string, string> = {
                    title: "Title",
                    status: "Status",
                    priority: "Priority",
                    description: "Description",
                    storyPoints: "Story Points",
                    dueDate: "Due Date",
                    startDate: "Start Date",
                    assignee: "Assignee",
                    assigneeId: "Assignee",
                    sprint: "Sprint",
                    sprintId: "Sprint",
                    labels: "Labels",
                    taskKey: "Task Key",
                    taskTitle: "Task Title",
                    projectName: "Project",
                  };
                  return (
                    map[key] ||
                    key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())
                  );
                };

                const actorName = log.actor
                  ? `${log.actor.firstName} ${log.actor.lastName}`
                  : "System";
                const actorInitials = log.actor
                  ? `${log.actor.firstName[0]}${log.actor.lastName[0]}`.toUpperCase()
                  : "SYS";

                const taskKey =
                  log.entityDetails?.key ||
                  (log.metadata?.taskKey as string | undefined);
                const displayTitle =
                  log.entityDetails?.title ||
                  (log.metadata?.taskTitle as string | undefined) ||
                  (log.diff?.title && typeof log.diff.title === "object"
                    ? ((log.diff.title as Record<string, unknown>)?.to as
                        string | undefined)
                    : (log.diff?.title as string | undefined));

                return (
                  <div
                    key={log.id}
                    className="p-4 transition-colors hover:bg-accent/25"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      {/* Left: Actor + Action */}
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 shrink-0 border border-border">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {actorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {actorName}
                            </span>
                            {getActionBadge(log.action)}
                            <Badge
                              variant="secondary"
                              className="font-mono text-[11px]"
                            >
                              {log.entityType}
                            </Badge>
                            {taskKey && (
                              <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/10 font-mono text-[11px] font-semibold text-primary"
                              >
                                {taskKey}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-foreground">
                              {displayTitle || `${log.entityType} Item`}
                            </span>
                            <span
                              className="font-mono text-[10px] text-muted-foreground/70"
                              title={`Full ID: ${log.entityId}`}
                            >
                              #{log.entityId.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp & Diff toggle */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-foreground">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span>
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {format(
                              new Date(log.createdAt),
                              "MMM d, yyyy • HH:mm:ss"
                            )}
                          </p>
                        </div>

                        {canExpand ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">
                              Details
                            </span>
                          </Button>
                        ) : (
                          <span className="px-2 text-[11px] text-muted-foreground/50 italic">
                            No changes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diff & Context Preview Expandable */}
                    {isExpanded && canExpand && (
                      <div className="mt-3 animate-in space-y-2.5 rounded-lg border border-border/80 bg-background/60 p-3.5 text-xs duration-150 fade-in-50">
                        <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                          <Layers className="size-3.5 text-primary" />
                          <span>Change Details & Context</span>
                        </div>
                        {hasDiff ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {Object.entries(
                              log.diff as Record<
                                string,
                                { from?: unknown; to?: unknown } | unknown
                              >
                            ).map(([key, val]) => {
                              const isDiffObj =
                                val &&
                                typeof val === "object" &&
                                ("from" in val || "to" in val);
                              const fromVal = isDiffObj
                                ? String(
                                    (val as { from?: unknown }).from ?? "none"
                                  )
                                : "";
                              const toVal = isDiffObj
                                ? String((val as { to?: unknown }).to ?? "none")
                                : String(val);

                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-between rounded-md border border-border/50 bg-card/80 px-3 py-2"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {formatKeyName(key)}:
                                  </span>
                                  {isDiffObj ? (
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <span className="text-[11px] text-rose-400 line-through">
                                        {fromVal}
                                      </span>
                                      <ArrowRight className="size-3 text-muted-foreground" />
                                      <span className="text-[11px] text-emerald-400">
                                        {toVal}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-mono text-[11px] text-foreground">
                                      {toVal}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No field differences were recorded for this action.
                          </p>
                        )}

                        {hasMetadata && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                            {Object.entries(
                              log.metadata as Record<string, unknown>
                            ).map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded border border-border/40 bg-muted/30 px-2 py-0.5"
                              >
                                <span className="font-semibold text-foreground/80">
                                  {formatKeyName(k)}:
                                </span>{" "}
                                {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/60 bg-card/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Showing page{" "}
              <span className="font-semibold text-foreground">{meta.page}</span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {meta.totalPages || 1}
              </span>{" "}
              ({meta.totalItems} total events)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
