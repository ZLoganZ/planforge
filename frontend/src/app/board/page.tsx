"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, FolderKanban, ListTodo } from "lucide-react";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-projects";

function BoardContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const isSpecificProject = Boolean(projectId && projectId !== "all");
  const { data: project } = useProject(isSpecificProject ? projectId! : "");

  return (
    <div className="flex h-full flex-1 flex-col space-y-4">
      {/* Dynamic Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          {isSpecificProject && project ? (
            <>
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Link
                  href="/projects"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <ArrowLeft className="size-3" /> Projects
                </Link>
                <span>/</span>
                <span className="font-semibold text-foreground">
                  {project.name} ({project.key})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FolderKanban className="size-6 text-primary" />
                <h2 className="text-2xl font-bold tracking-tight">
                  {project.name} Board
                </h2>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FolderKanban className="size-6 text-primary" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Kanban Board
                </h2>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Visualize workflow, drag and drop tasks across columns, and
                track progress in real-time.
              </p>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isSpecificProject && projectId ? (
            <>
              <Link href={`/projects/${projectId}/timeline`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Calendar className="size-3.5" />
                  Timeline
                </Button>
              </Link>
              <Link href={`/sprints`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Sprint Planning
                </Button>
              </Link>
              <Link href={`/tasks?projectId=${projectId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ListTodo className="size-3.5" />
                  List View
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/projects">
                <Button variant="outline" size="sm" className="text-xs">
                  Projects
                </Button>
              </Link>
              <Link href="/sprints">
                <Button variant="outline" size="sm" className="text-xs">
                  Sprint Planning
                </Button>
              </Link>
              <Link href="/tasks">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ListTodo className="size-3.5" />
                  All Tasks
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="min-h-0 flex-1">
        <KanbanBoard
          initialProjectId={isSpecificProject ? projectId! : undefined}
        />
      </div>
    </div>
  );
}

export default function CombinedBoardPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-120 w-full" />
          </div>
        }
      >
        <BoardContent />
      </Suspense>
    </AppLayout>
  );
}
