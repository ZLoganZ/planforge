import { useQuery } from "@tanstack/react-query";

import { analyticsApi } from "@/lib/api";

export interface DashboardKpis {
  totalTasks: number;
  inProgress: number;
  completedThisWeek: number;
  overdue: number;
  totalProjects: number;
  totalMembers: number;
  myTasks: number;
  createdThisWeek: number;
}

export interface StatusDistributionItem {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface PriorityDistributionItem {
  priority: string;
  label: string;
  count: number;
  color: string;
}

export interface SprintVelocityItem {
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
}

export interface MemberWorkloadItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalTasks: number;
  inProgress: number;
  todo: number;
  backlog: number;
  inReview: number;
  urgent: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl: string | null;
  } | null;
  entityDetails?: {
    name?: string;
    title?: string;
    key?: string;
    projectName?: string;
  } | null;
}

export interface CompletionTrendItem {
  date: string;
  completed: number;
}

export function useDashboardKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ["analytics", "dashboard"],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard();
      return res.data;
    },
  });
}

export function useStatusDistribution() {
  return useQuery<StatusDistributionItem[]>({
    queryKey: ["analytics", "status-distribution"],
    queryFn: async () => {
      const res = await analyticsApi.getStatusDistribution();
      return res.data;
    },
  });
}

export function usePriorityDistribution() {
  return useQuery<PriorityDistributionItem[]>({
    queryKey: ["analytics", "priority-distribution"],
    queryFn: async () => {
      const res = await analyticsApi.getPriorityDistribution();
      return res.data;
    },
  });
}

export function useSprintVelocity() {
  return useQuery<SprintVelocityItem[]>({
    queryKey: ["analytics", "velocity"],
    queryFn: async () => {
      const res = await analyticsApi.getVelocity();
      return res.data;
    },
  });
}

export function useMemberWorkload() {
  return useQuery<MemberWorkloadItem[]>({
    queryKey: ["analytics", "member-workload"],
    queryFn: async () => {
      const res = await analyticsApi.getMemberWorkload();
      return res.data;
    },
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery<RecentActivityItem[]>({
    queryKey: ["analytics", "recent-activity", limit],
    queryFn: async () => {
      const res = await analyticsApi.getRecentActivity(limit);
      return res.data;
    },
  });
}

export function useCompletionTrend() {
  return useQuery<CompletionTrendItem[]>({
    queryKey: ["analytics", "completion-trend"],
    queryFn: async () => {
      const res = await analyticsApi.getCompletionTrend();
      return res.data;
    },
  });
}

export interface SprintBurndownData {
  sprint: {
    id: string;
    name: string;
    status: string;
    totalPoints: number;
    completedPoints: number;
    remainingPoints: number;
    totalTasks: number;
    completedTasks: number;
    startDate: string;
    endDate: string;
  };
  points: Array<{
    dayIndex: number;
    dayLabel: string;
    date: string;
    ideal: number;
    actual: number | null;
    completedToDate: number;
  }>;
}

export function useSprintBurndown(sprintId?: string) {
  return useQuery<SprintBurndownData>({
    queryKey: ["analytics", "burndown", sprintId],
    queryFn: async () => {
      if (!sprintId) throw new Error("Sprint ID is required");
      const res = await analyticsApi.getBurndown(sprintId);
      return res.data;
    },
    enabled: Boolean(sprintId),
  });
}

