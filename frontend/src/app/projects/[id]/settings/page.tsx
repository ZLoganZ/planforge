"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Columns3,
  ListTodo,
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
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/hooks/use-projects";
import { cn, getErrorMessage } from "@/lib/utils";

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

const COLOR_OPTIONS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#eab308", // Yellow
  "#f97316", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Purple
];

interface ProjectData {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  color?: string | null;
}

function ProjectSettingsForm({ project }: { project: ProjectData }) {
  const router = useRouter();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [color, setColor] = useState(project.color || "#6366f1");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        },
      });
      toast.success("Project settings saved successfully");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update project settings"));
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete project "${project.name}"? All associated tasks, sprints, and data will be removed.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject.mutateAsync(project.id);
      toast.success("Project deleted successfully");
      router.push("/projects");
    } catch (err) {
      setIsDeleting(false);
      toast.error(getErrorMessage(err, "Failed to delete project"));
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-border/70 bg-card/60 shadow-xs backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
            <CardDescription>
              Update your project name, description, and visual identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-xs font-semibold">
                  Project Name *
                </Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-key" className="text-xs font-semibold">
                  Project Key
                </Label>
                <Input
                  id="project-key"
                  value={project.key}
                  disabled
                  className="h-9 bg-muted/50 font-mono text-sm text-muted-foreground uppercase"
                />
                <p className="text-[11px] text-muted-foreground">
                  Project keys cannot be changed after creation.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-desc" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide an overview of this project..."
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Project Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "size-8 rounded-full border-2 transition-transform hover:scale-110",
                      color === c
                        ? "scale-110 border-foreground shadow-sm"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={updateProject.isPending || !name.trim()}
                className="gap-1.5"
              >
                {updateProject.isPending ? (
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

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Irreversible actions that affect this project and all its team data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Delete this Project
            </p>
            <p className="text-xs text-muted-foreground">
              Once deleted, all tasks, sprints, attachments, and activity
              history are gone.
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
            Delete Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading } = useProject(projectId);

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
        {/* Header and Breadcrumbs */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/projects"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Projects
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">
                {project ? `${project.name} (${project.key})` : "Project"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Project Settings
              </h1>
            </div>
          </div>

          {/* View Mode Navigation */}
          <div className="flex items-center gap-2">
            <Link href={`/board?projectId=${projectId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Columns3 className="size-3.5" />
                Board
              </Button>
            </Link>
            <Link href={`/tasks?projectId=${projectId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ListTodo className="size-3.5" />
                Tasks
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/timeline`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="size-3.5" />
                Timeline
              </Button>
            </Link>
          </div>
        </div>

        {project ? (
          <ProjectSettingsForm key={project.id} project={project} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Project not found.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
