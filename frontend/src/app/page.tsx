'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Users,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  useDashboardKpis,
  useStatusDistribution,
  usePriorityDistribution,
  useSprintVelocity,
  useMemberWorkload,
  useRecentActivity,
} from '@/hooks/use-analytics';
import { formatDistanceToNow } from 'date-fns';

const emptySubscribe = () => () => {};

export default function DashboardPage() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { data: kpis, isLoading: loadingKpis } = useDashboardKpis();
  const { data: statusData = [], isLoading: loadingStatus } = useStatusDistribution();
  const { data: priorityData = [], isLoading: loadingPriority } = usePriorityDistribution();
  const { data: velocityData = [], isLoading: loadingVelocity } = useSprintVelocity();
  const { data: workloads = [], isLoading: loadingWorkload } = useMemberWorkload();
  const { data: activities = [], isLoading: loadingActivity } = useRecentActivity(8);

  const kpiCards = [
    {
      title: 'Total Tasks',
      value: kpis?.totalTasks ?? 0,
      subtext: `${kpis?.createdThisWeek ?? 0} created this week`,
      icon: ListTodo,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      border: 'border-sky-500/20',
    },
    {
      title: 'In Progress',
      value: kpis?.inProgress ?? 0,
      subtext: `${kpis?.myTasks ?? 0} assigned to you`,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      title: 'Completed',
      value: kpis?.completedThisWeek ?? 0,
      subtext: 'Completed this week',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Overdue Tasks',
      value: kpis?.overdue ?? 0,
      subtext: (kpis?.overdue ?? 0) > 0 ? 'Requires attention' : 'All on track',
      icon: AlertTriangle,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      border: 'border-rose-500/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live operational metrics, sprint velocity, and team performance overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3.5 py-1.5 backdrop-blur-md">
              <FolderKanban className="size-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Projects:</span>
              <span className="text-xs font-bold text-foreground">
                {loadingKpis ? '...' : kpis?.totalProjects ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3.5 py-1.5 backdrop-blur-md">
              <Users className="size-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Members:</span>
              <span className="text-xs font-bold text-foreground">
                {loadingKpis ? '...' : kpis?.totalMembers ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.title}
              className={`relative overflow-hidden border transition-all duration-200 hover:shadow-md ${kpi.border}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {kpi.title}
                    </p>
                    {loadingKpis ? (
                      <Skeleton className="h-9 w-16" />
                    ) : (
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">
                        {kpi.value}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{kpi.subtext}</p>
                  </div>
                  <div className={`rounded-xl p-3.5 ${kpi.bgColor}`}>
                    <kpi.icon className={`size-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row: Status Donut + Priority Bar */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Status Distribution (Pie / Donut) */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Tasks by Status
              </CardTitle>
              <CardDescription>
                Current breakdown across workflow phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus || !mounted ? (
                <div className="flex h-64 items-center justify-center">
                  <Skeleton className="size-48 rounded-full" />
                </div>
              ) : statusData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No task data available yet
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(val) => (
                          <span className="text-xs text-muted-foreground">{val}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Distribution (Bar Chart) */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Tasks by Priority
              </CardTitle>
              <CardDescription>
                Urgency breakdown across active workload
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPriority || !mounted ? (
                <div className="flex h-64 items-center justify-center">
                  <Skeleton className="h-52 w-full" />
                </div>
              ) : priorityData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No priority data available
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={priorityData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {priorityData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Sprint Velocity & Team Workload */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Sprint Velocity */}
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Zap className="size-4 text-amber-500" />
                  Sprint Velocity & Completion
                </CardTitle>
                <CardDescription>
                  Total vs completed story points per sprint
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVelocity || !mounted ? (
                <div className="flex h-64 items-center justify-center">
                  <Skeleton className="h-52 w-full" />
                </div>
              ) : velocityData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Layers className="size-8 opacity-40" />
                  <span>No active or completed sprints found</span>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={velocityData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(val) => (
                          <span className="text-xs text-muted-foreground">{val}</span>
                        )}
                      />
                      <Bar
                        dataKey="totalPoints"
                        name="Committed Points"
                        fill="#64748b"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="completedPoints"
                        name="Completed Points"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member Workload */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="size-4 text-primary" />
                Team Workload
              </CardTitle>
              <CardDescription>
                Active tasks distributed across members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWorkload ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : workloads.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No active assigned tasks
                </div>
              ) : (
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {workloads.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-2.5 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarImage src={member.avatarUrl || ''} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs font-semibold text-foreground">
                          {member.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {member.inProgress > 0 && (
                          <Badge variant="secondary" className="border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                            {member.inProgress} In Dev
                          </Badge>
                        )}
                        {member.urgent > 0 && (
                          <Badge variant="destructive" className="px-1.5 py-0.5 text-[10px]">
                            {member.urgent} Urgent
                          </Badge>
                        )}
                        <span className="min-w-6 text-right font-mono text-xs font-bold text-muted-foreground">
                          {member.totalTasks} tasks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Third Row: Recent Audit Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold">
                  Recent System Activity
                </CardTitle>
                <CardDescription>
                  Live audit trail of project changes and user actions
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Live Feed
            </Badge>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No system activity recorded yet
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {activities.map((act) => {
                  const actorName = act.actor
                    ? `${act.actor.firstName} ${act.actor.lastName}`
                    : 'System';
                  const initials = act.actor
                    ? `${act.actor.firstName[0]}${act.actor.lastName[0]}`.toUpperCase()
                    : 'SYS';

                  // Human-readable task key & title
                  const key = act.entityDetails?.key || (act.metadata?.taskKey as string | undefined);
                  const title =
                    act.entityDetails?.title ||
                    (act.metadata?.taskTitle as string | undefined) ||
                    (act.diff?.title && typeof act.diff.title === 'object'
                      ? ((act.diff.title as Record<string, unknown>)?.to as string | undefined)
                      : (act.diff?.title as string | undefined));

                  let actionDetail = '';
                  if (act.action === 'STATUS_CHANGE' && act.diff?.status) {
                    const statusVal = act.diff.status;
                    const toVal =
                      typeof statusVal === 'object' && statusVal !== null && 'to' in statusVal
                        ? (statusVal as { to: unknown }).to
                        : statusVal;
                    if (toVal) {
                      actionDetail = `→ ${String(toVal).replace('_', ' ')}`;
                    }
                  }

                  const displayName = key && title ? `${key}: ${title}` : (title || key || `${act.entityType} #${act.entityId.slice(0, 6)}`);

                  return (
                    <div
                      key={act.id}
                      className="flex flex-col justify-between rounded-lg border border-border/40 bg-muted/20 p-3 text-xs transition-colors hover:border-border hover:bg-muted/40"
                    >
                      <div className="flex items-start gap-2.5">
                        <Avatar className="mt-0.5 size-6 shrink-0">
                          <AvatarImage src={act.actor?.avatarUrl || ''} />
                          <AvatarFallback className="text-[9px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold text-foreground">
                              {actorName}
                            </span>
                            <Badge
                              variant="secondary"
                              className="shrink-0 px-1 py-0 text-[9px] uppercase"
                            >
                              {act.action.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <p
                              className="line-clamp-2 font-medium text-foreground/90"
                              title={displayName}
                            >
                              {key && (
                                <span className="mr-1 rounded bg-primary/10 px-1 py-0.5 font-mono text-[10px] font-semibold text-primary">
                                  {key}
                                </span>
                              )}
                              <span>{title || `${act.entityType} #${act.entityId.slice(0, 6)}`}</span>
                            </p>
                            {actionDetail && (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {actionDetail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-right text-[10px] text-muted-foreground/80">
                        {formatDistanceToNow(new Date(act.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
