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

    const defaultQuery = {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    };

    await Promise.all([
      queryClient.query({
        queryKey: ["tasks", defaultQuery],
        queryFn: async () => {
          try {
            const res = await fetch(
              `${apiUrl}/tasks?page=1&limit=10&sortBy=createdAt&sortOrder=desc`,
              {
                headers: {
                  Authorization: `Bearer ${session.token}`,
                },
                cache: "no-store",
              }
            );
            if (!res.ok)
              return {
                items: [],
                meta: {
                  page: 1,
                  limit: 10,
                  totalItems: 0,
                  totalPages: 0,
                  hasNextPage: false,
                  hasPrevPage: false,
                  facets: { statuses: {}, priorities: {}, projects: {} },
                },
              };
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return {
              items: [],
              meta: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
                facets: { statuses: {}, priorities: {}, projects: {} },
              },
            };
          }
        },
      }),
      queryClient.query({
        queryKey: ["projects", { workspaceId: undefined }],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/projects?limit=50`, {
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
              cache: "no-store",
            });
            if (!res.ok)
              return {
                items: [],
                meta: {
                  page: 1,
                  limit: 50,
                  totalItems: 0,
                  totalPages: 0,
                  hasNextPage: false,
                  hasPrevPage: false,
                },
              };
            const json = await res.json();
            return json?.data ?? json;
          } catch {
            return {
              items: [],
              meta: {
                page: 1,
                limit: 50,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
              },
            };
          }
        },
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksClient />
    </HydrationBoundary>
  );
}
