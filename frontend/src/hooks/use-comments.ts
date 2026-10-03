import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  taskId: string;
  authorId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export function useTaskComments(taskId?: string) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`);
      return res.data;
    },
    enabled: Boolean(taskId),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      content,
    }: {
      taskId: string;
      content: string;
    }) => {
      const res = await api.post<TaskComment>(`/tasks/${taskId}/comments`, {
        content,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      taskId: _taskId,
    }: {
      commentId: string;
      taskId: string;
    }) => {
      void _taskId;
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
    },
  });
}
