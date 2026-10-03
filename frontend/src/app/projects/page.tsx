"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  FolderKanban,
  Layers,
  Settings,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";

export default function ProjectsPage() {
  const { data: response, isLoading } = useProjects();
  const projects = response?.items || [];

  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="size-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your team&apos;s workspaces, projects, and active
              workstreams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/board">
              <Button variant="outline" size="sm">
                Global Board
              </Button>
            </Link>
            <Link href="/sprints">
              <Button variant="outline" size="sm">
                Sprints
              </Button>
            </Link>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed p-12 text-center">
            <FolderKanban className="size-10 text-muted-foreground/60" />
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-sm text-muted-foreground">
              Get started by creating your first project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group flex flex-col justify-between border border-border/80 transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-9 items-center justify-center rounded-lg font-bold text-white shadow-xs"
                        style={{ backgroundColor: project.color || "#6366f1" }}
                      >
                        {project.key}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold transition-colors group-hover:text-primary">
                          {project.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="mt-0.5 h-4.5 px-1 font-mono text-[10px]"
                        >
                          {project.key}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.description || "No description provided."}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="size-3.5 text-primary" />
                        <span>{project._count?.tasks ?? 0} tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span>{project._count?.members ?? 1} members</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/board?projectId=${project.id}`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          className="h-8 w-full gap-1.5 text-xs shadow-xs"
                        >
                          Open Board
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                      <Link
                        href={`/projects/${project.id}/timeline`}
                        title="View Timeline"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                        >
                          <Calendar className="size-3.5" />
                        </Button>
                      </Link>
                      <Link href="/sprints" title="Sprint Planning">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                        >
                          <Layers className="size-3.5" />
                        </Button>
                      </Link>
                      <Link
                        href={`/projects/${project.id}/settings`}
                        title="Project Settings"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                        >
                          <Settings className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
