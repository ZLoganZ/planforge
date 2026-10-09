"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { TaskDetailForm } from "@/components/kanban/task-detail-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTask } from "@/hooks/use-tasks";

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: task, isLoading, isError } = useTask(id);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/tasks">
              <ArrowLeft className="size-4" />
              Back to Tasks
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Skeleton className="h-64 md:col-span-2" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : isError || !task ? (
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-3 pt-6">
              <AlertCircle className="size-10 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground">
                Task not found
              </h3>
              <p className="text-sm text-muted-foreground">
                The task you are looking for does not exist or may have been deleted.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/tasks">Return to Tasks list</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <TaskDetailForm
              key={task.id}
              task={task}
              onClose={() => router.push("/tasks")}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
