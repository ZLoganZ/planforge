import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure project settings, general info, and dangerous actions.",
};

export default function ProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
