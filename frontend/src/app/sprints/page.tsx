import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { SprintsClient } from "./sprints-client";

export const metadata: Metadata = {
  title: "Sprint Planning — PlanForge",
  description:
    "Plan sprint capacity, backlog grooming, and track team velocity.",
};

export default async function SprintsPage() {
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

    try {
      // 1. Fetch projects
      const projectsRes = await fetch(`${apiUrl}/projects?limit=50`, {
        headers: authHeaders,
        cache: "no-store",
      });
      const projectsJson = projectsRes.ok ? await projectsRes.json() : null;
      const projectsData = projectsJson?.data ?? projectsJson ?? { items: [] };
      const projects = Array.isArray(projectsData?.items)
        ? projectsData.items
        : [];

      queryClient.setQueryData(
        ["projects", { workspaceId: undefined }],
        projectsData
      );

      // Determine default project ID to pre-fetch its active sprint and tasks
      const defaultProject =
        projects.find(
          (p: { _count?: { tasks?: number } }) => (p._count?.tasks ?? 0) > 0
        ) || projects[0];
      const effectiveProjectId = defaultProject?.id;

      await Promise.allSettled([
        queryClient.query({
          queryKey: ["sprints", { projectId: effectiveProjectId || undefined }],
          queryFn: async () => {
            const endpoint = effectiveProjectId
              ? `${apiUrl}/sprints?projectId=${effectiveProjectId}`
              : `${apiUrl}/sprints`;
            const res = await fetch(endpoint, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return [];
            const json = await res.json();
            return json?.data ?? json;
          },
        }),
        queryClient.query({
          queryKey: [
            "tasks",
            { projectId: effectiveProjectId || undefined, limit: 100 },
          ],
          queryFn: async () => {
            const endpoint = effectiveProjectId
              ? `${apiUrl}/tasks?projectId=${effectiveProjectId}&limit=100`
              : `${apiUrl}/tasks?limit=100`;
            const res = await fetch(endpoint, {
              headers: authHeaders,
              cache: "no-store",
            });
            if (!res.ok) return { items: [] };
            const json = await res.json();
            return json?.data ?? json;
          },
        }),
      ]);
    } catch {
      // Graceful fallback
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SprintsClient />
    </HydrationBoundary>
  );
}
