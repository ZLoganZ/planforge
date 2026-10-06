"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive shadow-xl">
        <AlertOctagon className="size-10" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while rendering this page. You can try
        again or return to your dashboard.
      </p>

      {error?.message && process.env.NODE_ENV !== "production" && (
        <pre className="mt-4 max-w-lg overflow-x-auto rounded-lg border border-border/80 bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2 shadow-xs">
          <RotateCcw className="size-4" />
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="size-4" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
