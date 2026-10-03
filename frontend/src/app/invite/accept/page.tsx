import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AcceptInviteForm, type ValidatedInvite } from "./accept-invite-form";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

async function getInvitation(
  token?: string
): Promise<
  | { success: true; data: ValidatedInvite }
  | { success: false; error: string; missing?: boolean }
> {
  if (!token) {
    return {
      success: false,
      missing: true,
      error:
        "No invitation token was provided in the URL. Please verify your link.",
    };
  }

  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api";

  try {
    const res = await fetch(
      `${apiUrl}/invitations/validate?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error:
          json?.message ||
          "This invitation link has expired, been revoked, or already accepted.",
      };
    }

    const data = (json?.data || json) as ValidatedInvite;
    return { success: true, data };
  } catch {
    return {
      success: false,
      error:
        "Unable to connect to the server to verify this invitation. Please try again later.",
    };
  }
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { token } = await searchParams;
  if (!token) {
    return {
      title: "Missing Invitation Token — PlanForge",
      description: "No invitation token was provided.",
    };
  }

  const result = await getInvitation(token);
  if (!result.success) {
    return {
      title: "Invalid or Expired Invitation — PlanForge",
      description: result.error,
    };
  }

  const invite = result.data;
  return {
    title: `Join ${invite.workspace.name} on PlanForge`,
    description: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName} has invited you to collaborate on ${invite.workspace.name} as ${invite.role}.`,
    openGraph: {
      title: `Join ${invite.workspace.name} on PlanForge`,
      description: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName} has invited you to collaborate on ${invite.workspace.name}.`,
    },
  };
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const result = await getInvitation(token);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="size-150 rounded-full bg-primary/10 blur-[130px]" />
      </div>

      {!result.success ? (
        <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold">
              {result.missing
                ? "Missing Invitation Token"
                : "Invalid or Expired Invitation"}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {result.error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
            {!result.missing && (
              <p className="text-center text-xs text-muted-foreground">
                Need a new invite? Ask your workspace administrator to resend
                it.
              </p>
            )}
          </CardFooter>
        </Card>
      ) : (
        <AcceptInviteForm token={token!} invite={result.data} />
      )}
    </div>
  );
}
