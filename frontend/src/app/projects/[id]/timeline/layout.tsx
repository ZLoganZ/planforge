import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Gantt timeline visualization and scheduling for project tasks.",
};

export default function ProjectTimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
