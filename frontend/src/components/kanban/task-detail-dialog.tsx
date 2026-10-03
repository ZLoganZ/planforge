"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadAttachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/hooks/use-attachments";
import { useCreateLabel, useLabels } from "@/hooks/use-labels";
import { useSprints } from "@/hooks/use-sprints";
import { Task, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Hash,
  Layers,
  Loader2,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";

const PRESET_LABEL_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#10b981", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#64748b", // Slate
];

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TaskDetailForm({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "TODO");
  const [priority, setPriority] = useState(task.priority || "MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | undefined>(
    task.storyPoints ?? undefined,
  );
  const [sprintId, setSprintId] = useState<string>(
    task.sprintId || task.sprint?.id || "none",
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined,
  );

  const [selectedLabels, setSelectedLabels] = useState<
    { id: string; name: string; color: string }[]
  >(task.taskLabels?.map((tl) => tl.label) || []);

  const projectId = task.projectId || task.project?.id;
  const { data: projectLabels = [] } = useLabels(projectId);
  const createLabel = useCreateLabel();
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_LABEL_COLORS[5]);
  const [creatingLabelError, setCreatingLabelError] = useState<string | null>(null);

  const handleCreateLabel = async () => {
    const trimmed = labelSearch.trim();
    if (!trimmed || !projectId) return;
    setCreatingLabelError(null);
    try {
      const created = await createLabel.mutateAsync({
        name: trimmed,
        color: newLabelColor,
        projectId,
      });
      setSelectedLabels((prev) => [...prev, created]);
      setLabelSearch("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create label";
      setCreatingLabelError(msg);
    }
  };

  const { data: sprints } = useSprints({
    projectId: task.projectId || task.project?.id,
  });

  const { data: attachments = [], isLoading: loadingAttachments } =
    useAttachments(task.id);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    setUploadError(null);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      try {
        await uploadAttachment.mutateAsync({ taskId: task.id, file });
      } catch (err: unknown) {
        const errorMsg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Failed to upload file. Please try again.";
        setUploadError(errorMsg);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    try {
      await uploadFiles(files);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleSave = async () => {
    try {
      setSaveError(null);
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description,
        status,
        priority,
        storyPoints:
          storyPoints !== undefined ? Number(storyPoints) : undefined,
        sprintId: sprintId === "none" ? null : sprintId,
        dueDate: dueDate ? dueDate.toISOString() : null,
        labelIds: selectedLabels.map((l) => l.id),
      });
      onClose();
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      setSaveError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to save changes.",
      );
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask.mutateAsync(task.id);
      onClose();
    }
  };

  return (
    <>
      <DialogHeader className="space-y-1">
        <div className="flex items-center justify-between pr-6 font-mono text-xs text-muted-foreground">
          <span>
            {task.project?.key
              ? `${task.project.key}-${task.taskNumber}`
              : `PF-${task.taskNumber}`}
          </span>
          <span>Created {format(new Date(task.createdAt), "MMM d, yyyy")}</span>
        </div>
        <DialogTitle className="text-xl font-bold tracking-tight">
          Task Details
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-5 py-3">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="task-title" className="text-xs font-semibold">
            Title
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task summary"
            className="font-medium"
          />
        </div>

        {/* Quick Properties Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3.5 md:grid-cols-4">
          {/* Status */}
          <div className="space-y-1">
            <Label className="flex h-4 items-center gap-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              <CheckCircle2 className="size-3 shrink-0" /> Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BACKLOG">Backlog</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label className="flex h-4 items-center gap-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              <Tag className="size-3 shrink-0" /> Priority
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NONE">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sprint */}
          <div className="space-y-1">
            <Label className="flex h-4 items-center gap-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              <Layers className="size-3 shrink-0" /> Sprint
            </Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger className="h-8 truncate bg-background text-xs">
                <SelectValue placeholder="No Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Backlog (No Sprint)</SelectItem>
                {sprints?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Story Points */}
          <div className="space-y-1">
            <Label className="flex h-4 items-center gap-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              <Hash className="size-3 shrink-0" /> Story Points
            </Label>
            <Input
              type="number"
              min="0"
              value={storyPoints ?? ""}
              onChange={(e) =>
                setStoryPoints(
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              placeholder="Pts"
              className="h-8 bg-background text-xs"
            />
          </div>
        </div>

        {/* Due date & Assignee row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs font-semibold">
              <CalendarIcon className="size-3.5 text-muted-foreground" /> Due
              Date
            </Label>
            <div className="relative flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="task-due-date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left text-xs font-normal",
                      dueDate ? "pr-8" : "pr-3",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-60 w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDueDate(undefined);
                  }}
                  title="Clear due date"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Clear due date</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs font-semibold">
              <User className="size-3.5 text-muted-foreground" /> Assignee
            </Label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/20 px-3 text-xs">
              {task.assignee ? (
                <span>
                  {task.assignee.firstName} {task.assignee.lastName}
                </span>
              ) : (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="task-description" className="text-xs font-semibold">
            Description
          </Label>
          <Textarea
            id="task-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, acceptance criteria, or context..."
            className="resize-y text-sm"
          />
        </div>

        {/* Labels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Tag className="size-3.5 text-muted-foreground" />
              Labels
              {selectedLabels.length > 0 && (
                <span className="py-0.2 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                  {selectedLabels.length}
                </span>
              )}
            </Label>
            <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 size-3" />
                  Add Label
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-foreground">
                    Select or Create Labels
                  </div>
                  <Input
                    placeholder="Search or enter label..."
                    value={labelSearch}
                    onChange={(e) => {
                      setLabelSearch(e.target.value);
                      setCreatingLabelError(null);
                    }}
                    className="h-8 text-xs"
                  />

                  {/* List of existing project labels */}
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {projectLabels
                      .filter((l) =>
                        l.name.toLowerCase().includes(labelSearch.toLowerCase()),
                      )
                      .map((label) => {
                        const isSelected = selectedLabels.some(
                          (sl) => sl.id === label.id,
                        );
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedLabels((prev) =>
                                  prev.filter((l) => l.id !== label.id),
                                );
                              } else {
                                setSelectedLabels((prev) => [...prev, label]);
                              }
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80",
                              isSelected && "bg-muted font-medium",
                            )}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: label.color }}
                              />
                              <span className="truncate">{label.name}</span>
                            </span>
                            {isSelected && (
                              <Check className="size-3.5 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    {projectLabels.filter((l) =>
                      l.name.toLowerCase().includes(labelSearch.toLowerCase()),
                    ).length === 0 &&
                      !labelSearch && (
                        <div className="py-2 text-center text-[11px] text-muted-foreground">
                          No labels in this project yet.
                        </div>
                      )}
                  </div>

                  {/* Quick-create label if name typed doesn't exist */}
                  {labelSearch.trim() &&
                    !projectLabels.some(
                      (l) =>
                        l.name.toLowerCase() ===
                        labelSearch.trim().toLowerCase(),
                    ) && (
                      <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center gap-1.5">
                          {PRESET_LABEL_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewLabelColor(c)}
                              className={cn(
                                "size-4 rounded-full transition-transform hover:scale-110",
                                newLabelColor === c &&
                                  "ring-2 ring-primary ring-offset-1",
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateLabel}
                          disabled={createLabel.isPending}
                          className="h-7 w-full text-xs"
                        >
                          <Plus className="mr-1 size-3" />
                          Create &quot;{labelSearch.trim()}&quot;
                        </Button>
                        {creatingLabelError && (
                          <div className="text-[11px] text-destructive">
                            {creatingLabelError}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex min-h-6 flex-wrap items-center gap-1.5">
            {selectedLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  border: `1px solid ${label.color}40`,
                }}
              >
                {label.name}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLabels((prev) =>
                      prev.filter((l) => l.id !== label.id),
                    )
                  }
                  className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  title="Remove label"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {selectedLabels.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No labels attached.
              </span>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Paperclip className="size-3.5 text-muted-foreground" />
              Attachments
              {attachments.length > 0 && (
                <span className="py-0.2 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                  {attachments.length}
                </span>
              )}
            </Label>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={uploadAttachment.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadAttachment.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Upload className="size-3" />
                )}
                Upload
              </Button>
            </div>
          </div>

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-destructive/80 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {loadingAttachments ? (
            <div className="space-y-1.5">
              <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
            </div>
          ) : attachments.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed py-5 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border/80 hover:border-primary/50 hover:bg-muted/10"
              }`}
            >
              <Paperclip
                className={`size-6 ${
                  isDragging ? "text-primary" : "text-muted-foreground/60"
                }`}
              />
              <p className="mt-1.5 text-xs font-medium text-foreground">
                {isDragging
                  ? "Drop files here to upload"
                  : "Drop files here or click to browse"}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                Supports all files, images, documents up to 10MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-2 text-xs transition-colors hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {att.mimeType.startsWith("image/") ? (
                        <FileImage className="size-4 shrink-0 text-sky-500" />
                      ) : (
                        <FileText className="size-4 shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatFileSize(att.fileSize)} ·{" "}
                          {format(new Date(att.uploadedAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => downloadAttachment(att.id, att.fileName)}
                        title="Download file"
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={deleteAttachment.isPending}
                        onClick={() =>
                          deleteAttachment.mutateAsync({
                            id: att.id,
                            taskId: task.id,
                          })
                        }
                        title="Delete attachment"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add more files drop area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-2 text-center text-xs transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border/60 text-muted-foreground hover:border-primary/50 hover:bg-muted/10"
                }`}
              >
                <Plus className="size-3.5" />
                <span>Drop more files or click to add</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="my-2 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-destructive/80 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <DialogFooter className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteTask.isPending}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateTask.isPending}
          >
            {updateTask.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {task && open && (
          <TaskDetailForm
            key={task.id}
            task={task}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
