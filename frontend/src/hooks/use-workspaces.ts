import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  _count?: {
    members: number;
    projects: number;
  };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get<Workspace[]>("/workspaces");
      return res.data;
    },
  });
}

export function useWorkspace(id?: string) {
  return useQuery({
    queryKey: ["workspaces", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<Workspace>(`/workspaces/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      description?: string;
    }) => {
      const res = await api.post<Workspace>("/workspaces", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; logoUrl?: string };
    }) => {
      const res = await api.patch<Workspace>(`/workspaces/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({
        queryKey: ["workspaces", variables.id],
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
