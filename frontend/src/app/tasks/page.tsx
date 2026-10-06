import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { TasksClient } from "./tasks-client";

export const metadata: Metadata = {
  title: "Tasks — PlanForge",
  description:
    "View, filter, sort, and manage all tasks across your workspaces.",
};

export default async function TasksPage() {
  const session = await getServerSession();
  const queryClient = createServerQueryClient();

  if (session?.token) {
    const apiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000/api";

    await queryClient.query({
      queryKey: ["tasks", { limit: 50 }],
      queryFn: async () => {
        try {
          const res = await fetch(`${apiUrl}/tasks?limit=50`, {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            cache: "no-store",
          });
          if (!res.ok) return { items: [] };
          const json = await res.json();
          return json?.data ?? json;
        } catch {
          return { items: [] };
        }
      },
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksClient />
    </HydrationBoundary>
  );
}
