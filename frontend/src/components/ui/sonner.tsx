"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
          error:
            "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-destructive group-[.toaster]:!border-destructive/30",
          success:
            "group-[.toaster]:!bg-emerald-500/10 group-[.toaster]:!text-emerald-500 group-[.toaster]:!border-emerald-500/30",
          warning:
            "group-[.toaster]:!bg-amber-500/10 group-[.toaster]:!text-amber-500 group-[.toaster]:!border-amber-500/30",
          info: "group-[.toaster]:!bg-sky-500/10 group-[.toaster]:!text-sky-500 group-[.toaster]:!border-sky-500/30",
        },
      }}
      {...props}
    />
  );
};
export { toast, Toaster };
