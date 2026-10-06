import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — PlanForge",
  description: "Executive analytics, sprint progress, and task metrics.",
};

export default async function DashboardPage() {
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
        queryKey: ["analytics", "dashboard"],
        queryFn: async () => {
          const res = await fetch(`${apiUrl}/analytics/dashboard`, {
            headers: authHeaders,
            cache: "no-store",
          });
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
      queryClient.query({
        queryKey: ["analytics", "status-distribution"],
        queryFn: async () => {
          const res = await fetch(`${apiUrl}/analytics/status-distribution`, {
            headers: authHeaders,
            cache: "no-store",
          });
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
      queryClient.query({
        queryKey: ["analytics", "priority-distribution"],
        queryFn: async () => {
          const res = await fetch(`${apiUrl}/analytics/priority-distribution`, {
            headers: authHeaders,
            cache: "no-store",
          });
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
      queryClient.query({
        queryKey: ["analytics", "recent-activity", 8],
        queryFn: async () => {
          const res = await fetch(
            `${apiUrl}/analytics/recent-activity?limit=8`,
            {
              headers: authHeaders,
              cache: "no-store",
            }
          );
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
      queryClient.query({
        queryKey: ["analytics", "velocity"],
        queryFn: async () => {
          const res = await fetch(`${apiUrl}/analytics/velocity`, {
            headers: authHeaders,
            cache: "no-store",
          });
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
      queryClient.query({
        queryKey: ["analytics", "workload"],
        queryFn: async () => {
          const res = await fetch(`${apiUrl}/analytics/workload`, {
            headers: authHeaders,
            cache: "no-store",
          });
          const json = await res.json();
          return json?.data ?? json;
        },
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
