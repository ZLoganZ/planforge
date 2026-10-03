"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useAcceptInvitation } from "@/hooks/use-invitations";
import { getErrorMessage } from "@/lib/utils";

export interface ValidatedInvite {
  valid: boolean;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  workspace: { id: string; name: string; slug: string };
  invitedBy: { firstName: string; lastName: string; email: string };
  expiresAt: string;
}

interface AcceptInviteFormProps {
  token: string;
  invite: ValidatedInvite;
}

export function AcceptInviteForm({ token, invite }: AcceptInviteFormProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const acceptInvite = useAcceptInvitation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim()) {
      setFormError("First name is required");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = (await acceptInvite.mutateAsync({
        token,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        password,
      })) as { accessToken?: string; data?: { accessToken?: string } };

      setIsAccepted(true);

      const accessToken = res.data?.accessToken || res.accessToken;
      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
        await refreshUser();
      }

      router.push("/board");
    } catch (err: unknown) {
      setIsAccepted(false);
      setFormError(getErrorMessage(err, "Failed to accept invitation."));
    }
  };

  if (isAccepted) {
    return (
      <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">
            Welcome to the Workspace!
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Your invitation was accepted successfully. Preparing your
            workspace...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pt-2 pb-8">
          <Loader2 className="size-7 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
          <Zap className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Join {invite.workspace.name}
        </CardTitle>
        <CardDescription className="text-sm">
          <strong>
            {invite.invitedBy.firstName} {invite.invitedBy.lastName}
          </strong>{" "}
          has invited you to collaborate on PlanForge as{" "}
          <Badge variant="outline" className="ml-1 font-semibold text-primary">
            {invite.role}
          </Badge>
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Invited Email (Read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Your Email</Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={invite.email}
                disabled
                className="h-10 bg-muted/40 pl-9 font-medium text-foreground opacity-90"
              />
              <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="size-3.5" /> Verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first-name" className="text-xs font-semibold">
                First Name *
              </Label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="first-name"
                  placeholder="Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last-name" className="text-xs font-semibold">
                Last Name
              </Label>
              <Input
                id="last-name"
                placeholder="Morgan"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Create Password *
            </Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 pr-10 pl-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 font-semibold shadow-md"
            disabled={acceptInvite.isPending}
          >
            {acceptInvite.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Setting up your account...
              </>
            ) : (
              <>
                Accept Invitation & Join Team
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Log in instead
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
