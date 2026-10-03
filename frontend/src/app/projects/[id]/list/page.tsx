import { redirect } from "next/navigation";

interface ProjectListPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectListPage({
  params,
}: ProjectListPageProps) {
  const { id } = await params;
  redirect(`/tasks?projectId=${id}`);
}
