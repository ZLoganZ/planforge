import { TaskDetailClient } from "./task-detail-client";

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskPageProps) {
  const { id } = await params;
  return <TaskDetailClient id={id} />;
}
