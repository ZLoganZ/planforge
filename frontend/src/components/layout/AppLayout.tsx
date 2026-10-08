"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
          return;
        }
        const fullPath = window.location.pathname + window.location.search;
        const callbackParam =
          pathname !== "/"
            ? `?callbackUrl=${encodeURIComponent(fullPath)}`
            : "";
        router.push(`/login${callbackParam}` as Route);
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
