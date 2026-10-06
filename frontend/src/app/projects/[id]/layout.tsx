import type { Metadata } from "next";

import { getServerSession } from "@/lib/server-auth";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getServerSession();

  if (session?.token) {
    const apiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000/api";

    try {
      const res = await fetch(`${apiUrl}/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const project = json?.data ?? json;
        if (project?.name) {
          return {
            title: {
              template: `%s | ${project.name} — PlanForge`,
              default: `${project.name} (${project.key}) — PlanForge`,
            },
            description:
              project.description ||
              `Project workspace, sprint planning, and task tracking for ${project.name}.`,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  return {
    title: {
      template: "%s | Project — PlanForge",
      default: "Project — PlanForge",
    },
    description: "Project details, timeline, and settings in PlanForge.",
  };
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  return <>{children}</>;
}
