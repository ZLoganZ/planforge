"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Download, ListTodo, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { columns } from "@/components/tasks/columns";
import { DataTable } from "@/components/tasks/data-table";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksQuery, useTasks } from "@/hooks/use-tasks";
import { tasksApi } from "@/lib/api";

export function TasksClient() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Extract filters from columnFilters
  const rawSearch = columnFilters.find((f) => f.id === "title")?.value as
    | string
    | undefined;
  const statusFilter = columnFilters.find((f) => f.id === "status")?.value as
    | string[]
    | undefined;
  const priorityFilter = columnFilters.find((f) => f.id === "priority")
    ?.value as string[] | undefined;

  // Debounce search input for server request
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch ?? "");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch ?? "");
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  // Reset pageIndex to 0 when search or filters change
  const prevFiltersRef = useRef({
    debouncedSearch,
    statusFilter,
    priorityFilter,
    projectId,
  });
  useEffect(() => {
    if (
      prevFiltersRef.current.debouncedSearch !== debouncedSearch ||
      prevFiltersRef.current.statusFilter !== statusFilter ||
      prevFiltersRef.current.priorityFilter !== priorityFilter ||
      prevFiltersRef.current.projectId !== projectId
    ) {
      prevFiltersRef.current = {
        debouncedSearch,
        statusFilter,
        priorityFilter,
        projectId,
      };
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
      );
    }
  }, [debouncedSearch, statusFilter, priorityFilter, projectId]);

  // Reset pageIndex to 0 when sorting changes
  const sort = sorting[0];
  const sortBy = sort?.id ?? "createdAt";
  const sortOrder = sort?.desc ? "desc" : "asc";

  const prevSortRef = useRef({ sortBy, sortOrder });
  useEffect(() => {
    if (
      prevSortRef.current.sortBy !== sortBy ||
      prevSortRef.current.sortOrder !== sortOrder
    ) {
      prevSortRef.current = { sortBy, sortOrder };
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
      );
    }
  }, [sortBy, sortOrder]);

  // Construct query object
  const query: TasksQuery = useMemo(() => {
    const q: TasksQuery = {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy,
      sortOrder,
    };
    if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
    if (projectId) q.projectId = projectId;
    if (statusFilter && statusFilter.length > 0) q.statuses = statusFilter;
    if (priorityFilter && priorityFilter.length > 0)
      q.priorities = priorityFilter;
    return q;
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    projectId,
    statusFilter,
    priorityFilter,
  ]);

  const { data: response, isLoading, isFetching } = useTasks(query);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await tasksApi.exportCsv({
        ...(projectId ? { projectId } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(statusFilter && statusFilter.length > 0
          ? { statuses: statusFilter }
          : {}),
        ...(priorityFilter && priorityFilter.length > 0
          ? { priorities: priorityFilter }
          : {}),
      });
    } catch (err) {
      console.error("Failed to export tasks CSV:", err);
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
            <TaskCreateModal>
              <Button>
                <ListTodo className="mr-2 size-4" />
                Create Task
              </Button>
            </TaskCreateModal>
          </div>
        </div>

        {isLoading && !response ? (
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-62.5" />
              <Skeleton className="h-8 w-25" />
            </div>
            <Skeleton className="h-100 w-full" />
          </div>
        ) : (
          <DataTable
            data={response?.items || []}
            columns={columns}
            pageCount={response?.meta?.totalPages ?? 0}
            totalRows={response?.meta?.totalItems ?? 0}
            facets={response?.meta?.facets}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            isLoading={isFetching}
          />
        )}
      </div>
    </AppLayout>
  );
}
