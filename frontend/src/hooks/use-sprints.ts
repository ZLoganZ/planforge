import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task } from './use-tasks';

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  project?: { id: string; name: string; key: string };
  totalTasks?: number;
  completedTasks?: number;
  totalPoints?: number;
  completedPoints?: number;
  tasks?: Task[];
}

export interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId: string;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string;
  status?: SprintStatus;
  startDate?: string;
  endDate?: string;
}

export function useSprints(query: { projectId?: string; status?: SprintStatus } = {}) {
  return useQuery({
    queryKey: ['sprints', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.projectId) params.append('projectId', query.projectId);
      if (query.status) params.append('status', query.status);

      const { data } = await api.get<Sprint[]>(`/sprints?${params.toString()}`);
      return data;
    },
  });
}

export function useSprint(id: string) {
  return useQuery({
    queryKey: ['sprint', id],
    queryFn: async () => {
      const { data } = await api.get<Sprint>(`/sprints/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSprintInput) => {
      const { data } = await api.post<Sprint>('/sprints', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSprintInput & { id: string }) => {
      const { data } = await api.patch<Sprint>(`/sprints/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint'] });
    },
  });
}

export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Sprint>(`/sprints/${id}/start`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint'] });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Sprint>(`/sprints/${id}/complete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint'] });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/sprints/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
