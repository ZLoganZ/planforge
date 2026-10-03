"use client";

import { useQuery } from "@tanstack/react-query";

import { auditLogsApi } from "@/lib/api";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  entityDetails?: {
    name?: string;
    title?: string;
    key?: string;
    projectName?: string;
  } | null;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entityType?: string;
  actorId?: string;
}

export function useAuditLogs(params?: AuditLogsParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: async () => {
      const res = await auditLogsApi.getAll(params as Record<string, unknown>);
      return res.data;
    },
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ["audit-logs-stats"],
    queryFn: async () => {
      const res = await auditLogsApi.getStats();
      return res.data;
    },
  });
}
