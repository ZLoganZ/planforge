import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface ProjectsResponse {
  items: Project[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function useProjects(workspaceId?: string) {
  return useQuery({
    queryKey: ['projects', { workspaceId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (workspaceId) params.append('workspaceId', workspaceId);
      params.append('limit', '50');

      const { data } = await api.get<ProjectsResponse>(`/projects?${params.toString()}`);
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; key: string; description?: string; color?: string; workspaceId: string }) => {
      const { data } = await api.post<Project>('/projects', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
