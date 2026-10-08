"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
  useWorkspaces,
  Workspace,
} from "@/hooks/use-workspaces";
import { getErrorMessage } from "@/lib/utils";

const STORAGE_KEY = "planforge_selected_workspace_id";

function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if workspace changes
  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description || "");
  }, [workspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await updateWorkspace.mutateAsync({
        id: workspace.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      toast.success("Workspace settings saved successfully");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update workspace settings"));
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete workspace "${workspace.name}"? All associated projects, tasks, sprints, and data will be removed.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteWorkspace.mutateAsync(workspace.id);

      // Clear localStorage
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      toast.success("Workspace deleted successfully");
      router.push("/");
    } catch (err) {
      setIsDeleting(false);
      toast.error(getErrorMessage(err, "Failed to delete workspace"));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-border/70 bg-card/60 shadow-xs backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
            <CardDescription>
              Update your workspace name and description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-xs font-semibold">
                  Workspace Name *
                </Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-slug" className="text-xs font-semibold">
                  Workspace Slug
                </Label>
                <Input
                  id="ws-slug"
                  value={workspace.slug}
                  disabled
                  className="h-9 bg-muted/50 font-mono text-sm text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Workspace slug cannot be changed after creation.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-desc" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide an overview of this workspace..."
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={updateWorkspace.isPending || !name.trim()}
                className="gap-1.5"
              >
                {updateWorkspace.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Irreversible actions that affect this workspace and all its data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Delete this Workspace
            </p>
            <p className="text-xs text-muted-foreground">
              Once deleted, all projects, tasks, sprints, attachments, and
              activity history are gone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="shrink-0 gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete Workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } =
    useWorkspaces();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setActiveWorkspaceId(saved);
      } else if (workspaces.length > 0) {
        setActiveWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces]);

  const { data: workspace, isLoading: isLoadingWorkspace } = useWorkspace(
    activeWorkspaceId || undefined
  );

  const isLoading = isLoadingWorkspaces || isLoadingWorkspace;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Workspace Settings
          </h1>
        </div>

        {workspace ? (
          <WorkspaceSettingsForm key={workspace.id} workspace={workspace} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Workspace not found.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
