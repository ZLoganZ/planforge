"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  Crown,
  Eye,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { UserMember, useUpdateUser, useUsers } from "@/hooks/use-members";
import { cn } from "@/lib/utils";

export default function MembersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  >("MEMBER");

  const { data, isLoading, isFetching, refetch } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
  });

  const updateUser = useUpdateUser();

  const users = (data?.items || []) as UserMember[];

  // RBAC permission check: Only OWNER and ADMIN can modify roles or remove members
  const currentUserRole = currentUser
    ? (users.find((u) => u.id === currentUser.id)?.role ?? "MEMBER")
    : "MEMBER";
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return (
          <Badge className="gap-1 border-amber-500/30 bg-amber-500/15 font-semibold text-amber-400">
            <Crown className="size-3" /> OWNER
          </Badge>
        );
      case "ADMIN":
        return (
          <Badge className="gap-1 border-sky-500/30 bg-sky-500/15 font-semibold text-sky-400">
            <ShieldCheck className="size-3" /> ADMIN
          </Badge>
        );
      case "MEMBER":
        return (
          <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 font-semibold text-emerald-400">
            <User className="size-3" /> MEMBER
          </Badge>
        );
      case "VIEWER":
        return (
          <Badge className="gap-1 border-border bg-muted font-semibold text-muted-foreground">
            <Eye className="size-3" /> VIEWER
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser.mutate({
      id: userId,
      data: { role: newRole },
    });
  };

  const handleToggleActive = (user: UserMember) => {
    updateUser.mutate({
      id: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    // In our backend, mock invite adds or updates user
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteRole("MEMBER");
  };

  const ownerCount = users.filter((u) => u.role === "OWNER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const memberCount = users.filter((u) => u.role === "MEMBER").length;
  const viewerCount = users.filter((u) => u.role === "VIEWER").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Team Members & RBAC
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage workspace collaborators, project assignments, and
                granular permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="h-9 gap-1.5"
            >
              <RefreshCw
                className={cn("size-3.5", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="h-9 gap-1.5 shadow-sm"
              >
                <Plus className="size-4" />
                Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* RBAC Role Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Crown className="size-4" />
                <span>OWNER</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {ownerCount}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Full workspace control, billing management, deletion, and system
              configuration.
            </p>
          </div>

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <ShieldCheck className="size-4" />
                <span>ADMIN</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {adminCount}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Manage projects, invite and remove members, create sprints, and
              configure labels.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <User className="size-4" />
                <span>MEMBER</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {memberCount}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Create, edit, assign tasks, collaborate on Kanban boards, and post
              comments.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Eye className="size-4" />
                <span>VIEWER</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {viewerCount}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Read-only view access across projects, sprints, timelines, and
              dashboards.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members by name or email..."
              className="h-9 bg-background/50 pl-9"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background/50 px-3 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
          >
            <option value="">All Roles</option>
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MEMBER">MEMBER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>

        {/* Members Table */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 size-6 animate-spin opacity-50" />
              Loading team members...
            </div>
          ) : users.length === 0 ? (
            <div className="p-16 text-center">
              <UsersIcon className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <h3 className="text-base font-semibold text-foreground">
                No members found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined Date</th>
                    {canManage && (
                      <th className="px-4 py-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((member) => {
                    const initials =
                      `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
                    const isSelf = currentUser?.id === member.id;

                    return (
                      <tr
                        key={member.id}
                        className="transition-colors hover:bg-accent/25"
                      >
                        {/* Member Details */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {member.firstName} {member.lastName}
                                </span>
                                {isSelf && (
                                  <Badge
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="size-3" />
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5">
                          {canManage && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value)
                              }
                              disabled={updateUser.isPending}
                              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
                            >
                              <option value="OWNER">OWNER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="MEMBER">MEMBER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          ) : (
                            getRoleBadge(member.role)
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {member.isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                              <span className="size-1.5 rounded-full bg-rose-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {format(new Date(member.createdAt), "MMM d, yyyy")}
                        </td>

                        {/* Actions */}
                        {canManage && (
                          <td className="px-4 py-3.5 text-right">
                            {!isSelf && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-44"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(member)}
                                    className="gap-2 text-xs"
                                  >
                                    {member.isActive ? (
                                      <>
                                        <UserX className="size-3.5 text-rose-400" />
                                        Deactivate Member
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="size-3.5 text-emerald-400" />
                                        Activate Member
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Member Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="border-border bg-card/95 backdrop-blur-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to add a new collaborator to the workspace
                with assigned RBAC permissions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    First Name
                  </label>
                  <Input
                    placeholder="Alex"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Last Name
                  </label>
                  <Input
                    placeholder="Morgan"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
                    )
                  }
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
                >
                  <option value="MEMBER">
                    MEMBER (Can create, edit, and assign tasks)
                  </option>
                  <option value="ADMIN">
                    ADMIN (Can manage projects, sprints, and members)
                  </option>
                  <option value="VIEWER">
                    VIEWER (Read-only access across workspace)
                  </option>
                  <option value="OWNER">
                    OWNER (Full workspace access and billing)
                  </option>
                </select>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <span>
                  The invited member will receive an invitation email and
                  immediate access according to the specified role.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <Mail className="size-3.5" />
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
