'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useProject } from '@/hooks/use-projects';
import { FolderKanban, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProjectBoardPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams.id;
  const { data: project } = useProject(projectId);

  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-4">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/projects" className="flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="size-3" /> Projects
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">
                {project ? `${project.name} (${project.key})` : 'Project'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FolderKanban className="size-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                {project ? `${project.name} Board` : 'Project Board'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/sprints">
              <Button variant="outline" size="sm">
                Sprint Planning
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                List View
              </Button>
            </Link>
          </div>
        </div>

        {/* Board Component */}
        <div className="min-h-0 flex-1">
          <KanbanBoard initialProjectId={projectId} />
        </div>
      </div>
    </AppLayout>
  );
}
