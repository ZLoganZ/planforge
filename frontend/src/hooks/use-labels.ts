import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: string;
}

export interface CreateLabelDto {
  name: string;
  color: string;
  projectId: string;
}

export function useLabels(projectId?: string) {
  return useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await api.get<Label[]>(`/labels/project/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateLabelDto) => {
      const { data } = await api.post<Label>("/labels", dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["labels", variables.projectId] });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/labels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });
}
