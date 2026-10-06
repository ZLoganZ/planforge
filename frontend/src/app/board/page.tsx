import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { BoardClient } from "./board-client";

export const metadata: Metadata = {
  title: "Kanban Board — PlanForge",
  description:
    "Interactive drag-and-drop Kanban board for task tracking, sprint management, and real-time collaboration.",
};

export default async function BoardPage() {
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
        queryKey: ["projects", { workspaceId: undefined }],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/projects?limit=50`, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return { items: [] };
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return { items: [] };
          }
        },
      }),
      queryClient.query({
        queryKey: [
          "tasks",
          { limit: 100, projectId: undefined, sprintId: undefined },
        ],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/tasks?limit=100`, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return { items: [] };
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return { items: [] };
          }
        },
      }),
      queryClient.query({
        queryKey: ["sprints", { projectId: undefined }],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/sprints`, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return [];
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return [];
          }
        },
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardClient />
    </HydrationBoundary>
  );
}
