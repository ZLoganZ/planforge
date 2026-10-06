import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Tasks — PlanForge",
  description: "Batch import tasks into PlanForge from CSV or JSON files.",
};

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
