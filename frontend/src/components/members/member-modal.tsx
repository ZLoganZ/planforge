"use client";

import * as React from "react";
import { AlertCircle, Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { UserMember, useUpdateUser } from "@/hooks/use-members";
import { getErrorMessage } from "@/lib/utils";

interface MemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: UserMember | null;
  currentUserId?: string;
  onSuccess?: () => void;
}

function MemberEditForm({
  member,
  isSelf,
  onClose,
  onSuccess,
}: {
  member: UserMember;
  isSelf: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const updateUser = useUpdateUser();

  const [firstName, setFirstName] = React.useState(member.firstName || "");
  const [lastName, setLastName] = React.useState(member.lastName || "");
  const [email, setEmail] = React.useState(member.email || "");
  const [avatarUrl, setAvatarUrl] = React.useState(member.avatarUrl || "");
  const [role, setRole] = React.useState<
    "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  >(member.role || "MEMBER");
  const [isActive, setIsActive] = React.useState<boolean>(
    member.isActive ?? true
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "U";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg("First name, last name, and email are required.");
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: member.id,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          avatarUrl: avatarUrl.trim() || null,
          role,
          isActive,
        },
      });
      toast.success("Member details updated successfully");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to update member."));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          Edit Member Profile
        </DialogTitle>
        <DialogDescription>
          Update user personal details, role, permissions, and account status.
        </DialogDescription>
      </DialogHeader>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Avatar preview */}
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-3">
        <Avatar className="size-14 border border-border">
          <AvatarImage src={avatarUrl || ""} alt={`${firstName} ${lastName}`} />
          <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {firstName} {lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="member-first-name" className="text-xs font-semibold">
            First Name *
          </Label>
          <Input
            id="member-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            required
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="member-last-name" className="text-xs font-semibold">
            Last Name *
          </Label>
          <Input
            id="member-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="member-email" className="text-xs font-semibold">
          Email Address *
        </Label>
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane.doe@example.com"
          required
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="member-avatar-url" className="text-xs font-semibold">
          Avatar Image URL
        </Label>
        <Input
          id="member-avatar-url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Role{" "}
            {isSelf && (
              <span className="font-normal text-muted-foreground">(Self)</span>
            )}
          </Label>
          <Select
            value={role}
            disabled={isSelf}
            onValueChange={(val) =>
              setRole(val as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER")
            }
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNER" className="text-xs">
                OWNER (Full Workspace Control)
              </SelectItem>
              <SelectItem value="ADMIN" className="text-xs">
                ADMIN (Manage Projects & Members)
              </SelectItem>
              <SelectItem value="MEMBER" className="text-xs">
                MEMBER (Create & Edit Tasks)
              </SelectItem>
              <SelectItem value="VIEWER" className="text-xs">
                VIEWER (Read-Only Access)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Account Status{" "}
            {isSelf && (
              <span className="font-normal text-muted-foreground">(Self)</span>
            )}
          </Label>
          <Select
            value={isActive ? "ACTIVE" : "INACTIVE"}
            disabled={isSelf}
            onValueChange={(val) => setIsActive(val === "ACTIVE")}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE" className="text-xs">
                🟢 Active (Can login)
              </SelectItem>
              <SelectItem value="INACTIVE" className="text-xs">
                🔴 Inactive (Suspended)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isActive && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-500 dark:text-amber-400">
          Suspended accounts will not be able to log in or be assigned new
          tasks.
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={
            updateUser.isPending ||
            !firstName.trim() ||
            !lastName.trim() ||
            !email.trim()
          }
        >
          {updateUser.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MemberModal({
  open,
  onOpenChange,
  member,
  currentUserId,
  onSuccess,
}: MemberModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card/95 backdrop-blur-xl sm:max-w-md">
        {open && member && (
          <MemberEditForm
            key={member.id}
            member={member}
            isSelf={Boolean(currentUserId && member.id === currentUserId)}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
