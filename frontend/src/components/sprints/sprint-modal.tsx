"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sprint, useCreateSprint, useUpdateSprint } from "@/hooks/use-sprints";

interface SprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sprintToEdit?: Sprint | null;
}

function SprintForm({
  projectId,
  sprintToEdit,
  onClose,
}: {
  projectId: string;
  sprintToEdit?: Sprint | null;
  onClose: () => void;
}) {
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();

  const [name, setName] = React.useState(sprintToEdit?.name || "");
  const [goal, setGoal] = React.useState(sprintToEdit?.goal || "");
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    sprintToEdit?.startDate ? new Date(sprintToEdit.startDate) : undefined
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    sprintToEdit?.endDate ? new Date(sprintToEdit.endDate) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (sprintToEdit) {
      await updateSprint.mutateAsync({
        id: sprintToEdit.id,
        name,
        goal,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
      });
    } else {
      await createSprint.mutateAsync({
        name,
        goal,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        projectId,
      });
    }

    onClose();
  };

  const isPending = createSprint.isPending || updateSprint.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {sprintToEdit ? "Edit Sprint" : "Create New Sprint"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="sprint-name" className="text-xs font-semibold">
            Sprint Name *
          </Label>
          <Input
            id="sprint-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint 4 — Performance"
            required
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sprint-goal" className="text-xs font-semibold">
            Sprint Goal
          </Label>
          <Textarea
            id="sprint-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What is this sprint aiming to achieve?"
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Start Date</Label>
            <DatePicker
              id="sprint-start-date"
              date={startDate}
              onSelect={setStartDate}
              placeholder="Pick start date"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">End Date</Label>
            <DatePicker
              id="sprint-end-date"
              date={endDate}
              onSelect={setEndDate}
              placeholder="Pick end date"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending
            ? "Saving..."
            : sprintToEdit
              ? "Save Changes"
              : "Create Sprint"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SprintModal({
  open,
  onOpenChange,
  projectId,
  sprintToEdit,
}: SprintModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <SprintForm
            key={sprintToEdit?.id || "new"}
            projectId={projectId}
            sprintToEdit={sprintToEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
