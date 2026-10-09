import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows?: number;
}

export function DataTablePagination<TData>({
  table,
  totalRows,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalDisplayRows = totalRows ?? table.getFilteredRowModel().rows.length;

  const displayCurrentPage = pageCount === 0 ? 0 : pageIndex + 1;

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 py-1 sm:flex-row">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedCount > 0 ? (
          <span>
            {selectedCount} of {totalDisplayRows} row(s) selected.
          </span>
        ) : (
          <span>
            Total {totalDisplayRows} {totalDisplayRows === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-18">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-25 items-center justify-center text-sm font-medium">
          Page {displayCurrentPage} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage() || pageCount <= 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || pageCount <= 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || pageCount <= 1}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(Math.max(0, pageCount - 1))}
            disabled={!table.getCanNextPage() || pageCount <= 1}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
