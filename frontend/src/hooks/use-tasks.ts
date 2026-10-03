import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  storyPoints: number;
  dueDate: string | null;
  position: number;
  createdAt: string;
  projectId: string;
  sprintId: string | null;
  project: { id: string; key: string; name: string };
  assignee: { id: string; firstName: string; lastName: string; avatarUrl: string } | null;
  reporter: { id: string; firstName: string; lastName: string; avatarUrl: string } | null;
  taskLabels: { label: { id: string; name: string; color: string } }[];
  sprint: { id: string; name: string; status?: string } | null;
}

export interface TasksResponse {
  items: Task[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface TasksQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  projectId?: string;
  sprintId?: string;
  statuses?: string[];
  priorities?: string[];
  assignees?: string[];
  labels?: string[];
}

export function useTasks(query: TasksQuery = {}) {
  return useQuery({
    queryKey: ['tasks', query],
    queryFn: async () => {
      // Build query string, handling arrays correctly for NestJS
      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.search) params.append('search', query.search);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query.projectId) params.append('projectId', query.projectId);
      if (query.sprintId) params.append('sprintId', query.sprintId);
      
      query.statuses?.forEach(status => params.append('statuses[]', status));
      query.priorities?.forEach(prio => params.append('priorities[]', prio));
      query.assignees?.forEach(id => params.append('assignees[]', id));
      query.labels?.forEach(id => params.append('labels[]', id));

      const { data } = await api.get<TasksResponse>(`/tasks?${params.toString()}`);
      return data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: Partial<Task> & { projectId: string }) => {
      const { data } = await api.post<Task>('/tasks', taskData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  storyPoints?: number | null;
  sprintId?: string | null;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  labelIds?: string[];
  order?: number;
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...taskData }: (UpdateTaskDto & Partial<Task>) & { id: string }) => {
      const { data } = await api.patch<Task>(`/tasks/${id}`, taskData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export interface ReorderTaskItem {
  id: string;
  position: number;
  status?: string;
  sprintId?: string | null;
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ReorderTaskItem[]) => {
      const { data } = await api.post('/tasks/reorder', { items });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export interface BulkUpdateTasksPayload {
  taskIds: string[];
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkUpdateTasksPayload) => {
      const { data } = await api.patch('/tasks/bulk', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { data } = await api.post('/tasks/bulk-delete', { taskIds });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}
