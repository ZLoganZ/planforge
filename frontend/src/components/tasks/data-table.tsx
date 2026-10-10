"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Project } from "@/hooks/use-projects";
import { Task } from "@/hooks/use-tasks";

import { DataTableBulkActions } from "./data-table-bulk-actions";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  totalRows?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  isLoading?: boolean;
  facets?: {
    statuses?: Record<string, number>;
    priorities?: Record<string, number>;
    projects?: Record<string, number>;
  };
  projects?: Project[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalRows,
  pagination: controlledPagination,
  onPaginationChange: setControlledPagination,
  sorting: controlledSorting,
  onSortingChange: setControlledSorting,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange: setControlledColumnFilters,
  isLoading,
  facets,
  projects,
}: DataTableProps<TData, TValue>) {
  const [internalRowSelection, setInternalRowSelection] = React.useState({});
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    []
  );
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  const isManualPagination = pageCount !== undefined;
  const isManualSorting = setControlledSorting !== undefined;
  const isManualFiltering = setControlledColumnFilters !== undefined;

  const pagination = controlledPagination ?? internalPagination;
  const onPaginationChange = setControlledPagination ?? setInternalPagination;
  const sorting = controlledSorting ?? internalSorting;
  const onSortingChange = setControlledSorting ?? setInternalSorting;
  const columnFilters = controlledColumnFilters ?? internalColumnFilters;
  const onColumnFiltersChange =
    setControlledColumnFilters ?? setInternalColumnFilters;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    pageCount: isManualPagination ? pageCount : undefined,
    manualPagination: isManualPagination,
    manualSorting: isManualSorting,
    manualFiltering: isManualFiltering,
    autoResetPageIndex: false,
    getRowId: (row: TData, index: number) =>
      (row as { id?: string }).id ?? String(index),
    state: {
      sorting,
      columnVisibility: internalColumnVisibility,
      rowSelection: internalRowSelection,
      columnFilters,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setInternalRowSelection,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setInternalColumnVisibility,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} facets={facets} projects={projects} />
      <DataTableBulkActions table={table as unknown as TanStackTable<Task>} />
      <div className="relative rounded-md border border-border bg-card">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalRows={totalRows} />
    </div>
  );
}
