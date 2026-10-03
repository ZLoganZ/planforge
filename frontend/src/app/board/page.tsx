"use client";

import { FolderKanban } from "lucide-react";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { AppLayout } from "@/components/layout/AppLayout";

export default function GlobalBoardPage() {
  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-4">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="size-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                Kanban Board
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Visualize workflow, drag and drop tasks across columns, and track
              progress in real-time.
            </p>
          </div>
        </div>

        {/* Board */}
        <div className="min-h-0 flex-1">
          <KanbanBoard />
        </div>
      </div>
    </AppLayout>
  );
}
