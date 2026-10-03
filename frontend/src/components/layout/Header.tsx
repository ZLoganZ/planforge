"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, LogOut, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { attachmentsApi } from "@/lib/api";

import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [mounted, setMounted] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const IconTheme = mounted ? (
    theme === "dark" ? (
      <Sun className="size-5" />
    ) : (
      <Moon className="size-5" />
    )
  ) : (
    <Loader2 className="size-5 animate-spin" />
  );

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      await attachmentsApi.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-lg">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks, projects..."
            className="w-70 bg-background/50 pl-9"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          {IconTheme}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <div className="ml-2 flex items-center gap-3 border-l border-border pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          {/* Avatar with click to upload */}
          <div className="group relative">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Avatar
              onClick={() =>
                !uploadingAvatar && avatarInputRef.current?.click()
              }
              className="size-9 cursor-pointer border-2 border-primary/20 transition-transform group-hover:scale-105"
            >
              <AvatarImage
                key={user?.avatarUrl}
                src={user?.avatarUrl || ""}
                alt={user?.firstName}
              />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            <div
              onClick={() =>
                !uploadingAvatar && avatarInputRef.current?.click()
              }
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              title="Change avatar"
            >
              <Camera className="size-3.5 text-white" />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-destructive"
            title="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
