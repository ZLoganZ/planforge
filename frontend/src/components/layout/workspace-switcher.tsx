"use client";

import React, { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/sonner";
import {
  useCreateWorkspace,
  useWorkspaces,
  Workspace,
} from "@/hooks/use-workspaces";
import { cn, getErrorMessage } from "@/lib/utils";

const STORAGE_KEY = "planforge_selected_workspace_id";

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();

  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedId = useMemo(() => {
    if (userSelectedId && workspaces.some((w) => w.id === userSelectedId)) {
      return userSelectedId;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && workspaces.some((w) => w.id === saved)) {
        return saved;
      }
    }
    return workspaces[0]?.id || "";
  }, [userSelectedId, workspaces]);

  const currentWorkspace =
    workspaces.find((w) => w.id === selectedId) || workspaces[0];

  const handleSelect = (ws: Workspace) => {
    setUserSelectedId(ws.id);
    localStorage.setItem(STORAGE_KEY, ws.id);
    setOpen(false);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate slug
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setCreateError(null);
    try {
      const created = await createWorkspace.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
      setUserSelectedId(created.id);
      localStorage.setItem(STORAGE_KEY, created.id);
      setCreateDialogOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      toast.success(`Workspace "${created.name}" created successfully`);
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Failed to create workspace."));
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between border-dashed bg-muted/30 text-xs font-normal hover:bg-muted/50",
              collapsed && "justify-center px-0"
            )}
            title={currentWorkspace?.name || "Workspace"}
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <Building2 className="size-3" />
              </div>
              {!collapsed && (
                <span className="truncate font-medium text-foreground">
                  {isLoading
                    ? "Loading..."
                    : currentWorkspace?.name || "Select Workspace"}
                </span>
              )}
            </div>
            {!collapsed && (
              <ChevronsUpDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5" align="start">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Workspaces
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleSelect(ws)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                  ws.id === selectedId &&
                    "bg-accent/60 font-semibold text-primary"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{ws.name}</span>
                </div>
                {ws.id === selectedId && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))}
            {workspaces.length === 0 && !isLoading && (
              <div className="p-2 text-center text-xs text-muted-foreground italic">
                No workspaces yet
              </div>
            )}
          </div>
          <div className="mt-1 border-t border-border/60 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setCreateDialogOpen(true);
              }}
              className="h-8 w-full justify-start gap-2 rounded px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" />
              <span>Create Workspace</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Create Workspace
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-slug">URL Slug</Label>
                <Input
                  id="ws-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. acme-corp"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-desc">Description (optional)</Label>
                <Input
                  id="ws-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace used for?"
                />
              </div>
              {createError && (
                <p className="text-[11px] text-destructive">{createError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  createWorkspace.isPending || !name.trim() || !slug.trim()
                }
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1 size-3.5" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
