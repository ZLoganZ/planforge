import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { ProjectsClient } from "./projects-client";

export const metadata: Metadata = {
  title: "Projects — PlanForge",
  description:
    "Manage your team's workspaces, projects, and active workstreams.",
};

export default async function ProjectsPage() {
  const session = await getServerSession();
  const queryClient = createServerQueryClient();

  if (session?.token) {
    const apiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000/api";

    await queryClient.query({
      queryKey: ["projects", { workspaceId: undefined }],
      queryFn: async () => {
        try {
          const res = await fetch(`${apiUrl}/projects?limit=50`, {
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
      <ProjectsClient />
    </HydrationBoundary>
  );
}
