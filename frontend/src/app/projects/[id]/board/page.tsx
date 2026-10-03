import { redirect } from "next/navigation";

interface ProjectBoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBoardPage({
  params,
}: ProjectBoardPageProps) {
  const { id } = await params;
  redirect(`/board?projectId=${id}`);
}
