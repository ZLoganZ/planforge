"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Camera,
  Loader2,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuth } from "@/context/auth-context";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
  useWorkspaces,
  Workspace,
} from "@/hooks/use-workspaces";
import { attachmentsApi, authApi } from "@/lib/api";
import { cn, getErrorMessage } from "@/lib/utils";

const STORAGE_KEY = "planforge_selected_workspace_id";

function ProfileSettingsForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter both your first and last name");
      return;
    }

    try {
      setIsSaving(true);
      await authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await refreshUser();
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      await attachmentsApi.uploadAvatar(file);
      await refreshUser();
      toast.success("Avatar uploaded successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleLogoutAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to sign out from all devices and invalidate all active sessions?"
      )
    ) {
      return;
    }

    try {
      setIsLoggingOutAll(true);
      await authApi.logoutAll();
      toast.success("All sessions terminated. Redirecting to login...");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your public profile and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-5">
            <div className="group relative">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <Avatar className="size-20 border-2 border-primary/20 shadow-sm">
                <AvatarImage
                  key={user?.avatarUrl}
                  src={user?.avatarUrl || undefined}
                  alt={user?.firstName}
                />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {isUploadingAvatar ? (
                    <Loader2 className="size-6 animate-spin text-primary" />
                  ) : (
                    initials
                  )}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() =>
                  !isUploadingAvatar && avatarInputRef.current?.click()
                }
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                title="Upload new avatar"
              >
                <Camera className="size-5 text-white" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Profile Photo
              </p>
              <p className="text-xs text-muted-foreground">
                Recommended size: 400x400px. JPG, PNG, or WebP.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  !isUploadingAvatar && avatarInputRef.current?.click()
                }
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                Change Photo
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Email address is tied to your account credentials and cannot be
                changed directly.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security & Sessions */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            <CardTitle>Security & Sessions</CardTitle>
          </div>
          <CardDescription>
            Manage active authenticated login sessions across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Sign Out of All Devices
            </p>
            <p className="text-xs text-muted-foreground">
              Revokes all refresh tokens and sessions for your account across all
              browsers and devices.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutAll}
            disabled={isLoggingOutAll}
            className="shrink-0 gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
          >
            {isLoggingOutAll ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="size-3.5" />
            )}
            Log Out All Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [isDeleting, setIsDeleting] = useState(false);

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
      toast.success("Workspace updated successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteWorkspace.mutateAsync(workspace.id);
      toast.success("Workspace deleted successfully!");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      router.push("/");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your workspace display name and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Organization"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ws-slug">Workspace Identifier (Slug)</Label>
              <Input
                id="ws-slug"
                value={workspace.slug}
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Slugs are unique and cannot be modified after workspace
                creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workspace..."
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateWorkspace.isPending}
                className="gap-2"
              >
                {updateWorkspace.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Workspace
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that affect this entire workspace and its
            members.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Delete this Workspace
            </p>
            <p className="text-xs text-muted-foreground">
              Once deleted, all projects, tasks, sprints, attachments, and
              activity history are gone permanently.
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"workspace" | "profile">(
    "workspace"
  );
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

  const isLoading =
    activeTab === "workspace" && (isLoadingWorkspaces || isLoadingWorkspace);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={cn(
                "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === "workspace"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="size-3.5" />
              Workspace
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === "profile"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserIcon className="size-3.5" />
              Profile & Account
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" ? (
          <ProfileSettingsForm />
        ) : isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : workspace ? (
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
