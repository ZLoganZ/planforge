'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable } from '@/components/tasks/data-table';
import { columns } from '@/components/tasks/columns';
import { TaskCreateModal } from '@/components/tasks/task-create-modal';
import { useTasks } from '@/hooks/use-tasks';
import { ListTodo, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tasksApi } from '@/lib/api';

export default function TasksPage() {
  const { data: response, isLoading } = useTasks({ limit: 50 });
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await tasksApi.exportCsv();
    } catch (err) {
      console.error('Failed to export tasks CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-1 flex-col space-y-8 md:flex">
        <div className="flex flex-col gap-4 space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground">
              Here&apos;s a list of all tasks across your projects!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export CSV
            </Button>
            <TaskCreateModal projectId="global">
              <Button>
                <ListTodo className="mr-2 size-4" />
                Create Task
              </Button>
            </TaskCreateModal>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-62.5" />
              <Skeleton className="h-8 w-25" />
            </div>
            <Skeleton className="h-100 w-full" />
          </div>
        ) : (
          <DataTable data={response?.items || []} columns={columns} />
        )}
      </div>
    </AppLayout>
  );
}
