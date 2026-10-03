"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  id,
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-start text-left text-xs font-normal",
              date ? "pr-8" : "pr-3",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {date ? format(date, "PPP") : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-60 w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            autoFocus
            className="rounded-lg border"
          />
        </PopoverContent>
      </Popover>
      {date && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(undefined);
          }}
          title="Clear date"
          className="absolute top-1/2 right-1.5 size-6 -translate-y-1/2 rounded-sm p-0 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none"
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear date</span>
        </Button>
      )}
    </div>
  );
}
