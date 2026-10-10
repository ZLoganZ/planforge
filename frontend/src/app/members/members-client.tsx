"use client";

import React, { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Eye,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { MemberModal } from "@/components/members/member-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/auth-context";
import {
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "@/hooks/use-invitations";
import { UserMember, useUpdateUser, useUsers } from "@/hooks/use-members";
import { cn, getErrorMessage } from "@/lib/utils";

export function MembersClient() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] =
    useState<UserMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  >("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, isFetching, refetch } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
  });

  const { data: invitations = [], refetch: refetchInvitations } =
    useInvitations();
  const createInvite = useCreateInvitation();
  const resendInvite = useResendInvitation();
  const revokeInvite = useRevokeInvitation();

  const updateUser = useUpdateUser();

  const users = (data?.items || []) as UserMember[];

  // RBAC permission check: Only OWNER and ADMIN can modify roles or remove members
  const currentUserRole =
    currentUser?.role ||
    (currentUser
      ? (users.find((u) => u.id === currentUser.id)?.role ?? "MEMBER")
      : "MEMBER");
  const isOwner = currentUserRole === "OWNER";
  const isAdmin = currentUserRole === "ADMIN";
  const canManage = isOwner || isAdmin;

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

  const handleToggleActive = async (user: UserMember) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive },
      });
      toast.success(
        `User ${user.firstName} ${user.lastName} ${!user.isActive ? "activated" : "deactivated"}`
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update member status."));
    }
  };

  const handleCloseInviteDialog = () => {
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteError(null);
    setCreatedInviteUrl(null);
    setCopiedLink(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);

    try {
      const res = await createInvite.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      const inviteUrl = `${window.location.origin}/invite/accept?token=${res.token}`;
      setCreatedInviteUrl(inviteUrl);
      void refetchInvitations();
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
    } catch (err: unknown) {
      setInviteError(getErrorMessage(err, "Failed to invite member."));
    }
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

          <Select
            value={roleFilter || "ALL"}
            onValueChange={(val) => setRoleFilter(val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="h-9 w-32.5 bg-background/50 text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Roles
              </SelectItem>
              <SelectItem value="OWNER" className="text-xs">
                OWNER
              </SelectItem>
              <SelectItem value="ADMIN" className="text-xs">
                ADMIN
              </SelectItem>
              <SelectItem value="MEMBER" className="text-xs">
                MEMBER
              </SelectItem>
              <SelectItem value="VIEWER" className="text-xs">
                VIEWER
              </SelectItem>
            </SelectContent>
          </Select>
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
                    const canEditMember =
                      !isSelf &&
                      (isOwner ||
                        (member.role !== "OWNER" && member.role !== "ADMIN"));
                    const canToggleActiveMember =
                      !isSelf &&
                      member.role !== "OWNER" &&
                      (isOwner || member.role !== "ADMIN");
                    const showActionMenu =
                      canManage && (canEditMember || canToggleActiveMember);

                    return (
                      <tr
                        key={member.id}
                        className="transition-colors hover:bg-accent/25"
                      >
                        {/* Member Details */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border">
                              <AvatarImage
                                src={member.avatarUrl || undefined}
                                alt={`${member.firstName} ${member.lastName}`}
                              />
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => {
                                    if (canEditMember) {
                                      setSelectedMemberForEdit(member);
                                      setIsEditModalOpen(true);
                                    }
                                  }}
                                  className={cn(
                                    "font-semibold text-foreground",
                                    canEditMember &&
                                      "cursor-pointer hover:text-primary hover:underline"
                                  )}
                                >
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
                          {getRoleBadge(member.role)}
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
                            {showActionMenu && (
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
                                  {canEditMember && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedMemberForEdit(member);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="gap-2 text-xs"
                                    >
                                      <Pencil className="size-3.5 text-primary" />
                                      Edit Member
                                    </DropdownMenuItem>
                                  )}
                                  {canToggleActiveMember && (
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
                                  )}
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

        {/* Pending Invitations Section */}
        {canManage && invitations.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Pending Invitations (
                {invitations.filter((i) => i.status === "PENDING").length})
              </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Invited By</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {invitations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-accent/25"
                    >
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 text-muted-foreground" />
                          <span>{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{getRoleBadge(inv.role)}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px] font-medium",
                            inv.status === "PENDING" &&
                              "border-amber-500/30 bg-amber-500/10 text-amber-500",
                            inv.status === "ACCEPTED" &&
                              "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
                            inv.status === "EXPIRED" &&
                              "border-destructive/30 bg-destructive/10 text-destructive"
                          )}
                        >
                          <Clock className="size-2.5" />
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {inv.invitedBy
                          ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`
                          : "Admin"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inv.expiresAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/invite/accept?token=${inv.token}`;
                              void navigator.clipboard.writeText(url);
                              toast.success(
                                "Invitation link copied to clipboard"
                              );
                            }}
                            title="Copy Invitation Link"
                            className="h-7 px-2 text-xs"
                          >
                            <Copy className="mr-1 size-3.5" />
                            Copy Link
                          </Button>
                          {inv.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resendInvite.isPending}
                              onClick={async () => {
                                try {
                                  await resendInvite.mutateAsync(inv.id);
                                  toast.success(
                                    `Invitation resent to ${inv.email}`
                                  );
                                } catch (err) {
                                  toast.error(
                                    getErrorMessage(
                                      err,
                                      "Failed to resend invitation"
                                    )
                                  );
                                }
                              }}
                              title="Resend email invitation"
                              className="h-7 px-2 text-xs text-primary hover:text-primary"
                            >
                              <Send className="mr-1 size-3.5" />
                              Resend
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={revokeInvite.isPending}
                            onClick={async () => {
                              try {
                                await revokeInvite.mutateAsync(inv.id);
                                toast.success(
                                  `Invitation for ${inv.email} revoked`
                                );
                              } catch (err) {
                                toast.error(
                                  getErrorMessage(
                                    err,
                                    "Failed to revoke invitation"
                                  )
                                );
                              }
                            }}
                            title="Revoke invitation"
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Member Dialog */}
        <Dialog
          open={isInviteOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseInviteDialog();
            else setIsInviteOpen(true);
          }}
        >
          <DialogContent className="border-border bg-card/95 backdrop-blur-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an email invitation to join this workspace with assigned
                role and permissions.
              </DialogDescription>
            </DialogHeader>

            {createdInviteUrl ? (
              <div className="space-y-4 py-3">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    Invitation Sent!
                  </h3>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    An email has been dispatched to{" "}
                    <strong>{inviteEmail}</strong>. You can also share the
                    direct invite link below:
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={createdInviteUrl}
                    readOnly
                    className="h-9 bg-muted/50 font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(createdInviteUrl);
                      setCopiedLink(true);
                      toast.success("Invitation link copied to clipboard");
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="shrink-0 gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    size="sm"
                    onClick={handleCloseInviteDialog}
                    className="w-full"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                {inviteError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      Email Address *
                    </Label>
                    <Input
                      type="email"
                      required
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Role *</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(val) =>
                        setInviteRole(
                          val as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER" className="text-xs">
                          MEMBER (Can create, edit, and assign tasks)
                        </SelectItem>
                        <SelectItem value="ADMIN" className="text-xs">
                          ADMIN (Can manage projects, sprints, and members)
                        </SelectItem>
                        <SelectItem value="VIEWER" className="text-xs">
                          VIEWER (Read-only access across workspace)
                        </SelectItem>
                        <SelectItem value="OWNER" className="text-xs">
                          OWNER (Full workspace access and billing)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      An email containing a secure 7-day onboarding link will be
                      sent to this address.
                    </span>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloseInviteDialog}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="gap-1.5"
                      disabled={createInvite.isPending || !inviteEmail.trim()}
                    >
                      {createInvite.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Sending Invitation...
                        </>
                      ) : (
                        <>
                          <Send className="size-3.5" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Member Modal */}
        <MemberModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          member={selectedMemberForEdit}
          currentUserId={currentUser?.id}
          currentUserRole={currentUserRole}
        />
      </div>
    </AppLayout>
  );
}
