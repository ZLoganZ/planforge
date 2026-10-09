import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  facets?: {
    statuses?: Record<string, number>;
    priorities?: Record<string, number>;
    projects?: Record<string, number>;
  };
  projects?: Project[];
}

export const statuses = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "Todo" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

export const priorities = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "NONE", label: "None" },
];

export function DataTableToolbar<TData>({
  table,
  facets,
  projects,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const projectOptions = React.useMemo(() => {
    if (!projects) return [];
    return projects.map((project) => ({
      label: project.name,
      value: project.id,
      icon: ({ className }: { className?: string }) => (
        <span className={cn("flex items-center justify-center", className)}>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: project.color || "#6366f1" }}
          />
        </span>
      ),
    }));
  }, [projects]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter tasks..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="h-8 w-37.5 pl-9 lg:w-62.5"
          />
        </div>
        {table.getColumn("project") && projectOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("project")}
            title="Project"
            options={projectOptions}
            facets={facets?.projects}
          />
        )}
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses}
            facets={facets?.statuses}
          />
        )}
        {table.getColumn("priority") && (
          <DataTableFacetedFilter
            column={table.getColumn("priority")}
            title="Priority"
            options={priorities}
            facets={facets?.priorities}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 text-muted-foreground lg:px-3"
          >
            Reset
            <X className="ml-2 size-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
