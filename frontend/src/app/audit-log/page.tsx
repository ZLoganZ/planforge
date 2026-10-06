import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { AuditLogClient } from "./audit-log-client";

export const metadata: Metadata = {
  title: "Audit Log & Compliance — PlanForge",
  description:
    "Comprehensive enterprise audit logs, entity mutation diffs, actor attribution, and security history.",
};

export default async function AuditLogPage() {
  const session = await getServerSession();
  const queryClient = createServerQueryClient();

  if (session?.token) {
    const apiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000/api";

    const authHeaders = {
      Authorization: `Bearer ${session.token}`,
    };

    await Promise.allSettled([
      queryClient.query({
        queryKey: [
          "audit-logs",
          {
            page: 1,
            limit: 15,
            search: undefined,
            action: undefined,
            entityType: undefined,
          },
        ],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/audit-logs?page=1&limit=15`, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return { items: [], meta: null };
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return { items: [], meta: null };
          }
        },
      }),
      queryClient.query({
        queryKey: ["audit-logs-stats"],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/audit-logs/stats`, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return null;
          }
        },
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuditLogClient />
    </HydrationBoundary>
  );
}
