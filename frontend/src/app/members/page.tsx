import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerSession } from "@/lib/server-auth";
import { createServerQueryClient } from "@/lib/server-query-client";

import { MembersClient } from "./members-client";

export const metadata: Metadata = {
  title: "Team Members & RBAC — PlanForge",
  description:
    "Manage workspace collaborators, project assignments, and granular permissions.",
};

export default async function MembersPage() {
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
        queryKey: ["users", { search: undefined, role: undefined }],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/users`, {
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
        queryKey: ["invitations"],
        queryFn: async () => {
          try {
            const res = await fetch(`${apiUrl}/invitations`, {
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
      <MembersClient />
    </HydrationBoundary>
  );
}
