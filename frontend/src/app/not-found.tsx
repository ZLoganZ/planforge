import Link from "next/link";
import { Compass, FolderKanban, Home } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-6 flex size-20 items-center justify-center rounded-2xl border border-border/80 bg-muted/30 shadow-xl">
        <Compass className="size-10 animate-pulse text-primary" />
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
          404
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist, has been removed, or
        you might not have permission to view it.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button className="gap-2 shadow-xs">
            <Home className="size-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline" className="gap-2">
            <FolderKanban className="size-4" />
            Projects
          </Button>
        </Link>
      </div>

      <div className="mt-12 text-xs text-muted-foreground/60">
        PlanForge &bull; Enterprise Project Management
      </div>
    </div>
  );
}
