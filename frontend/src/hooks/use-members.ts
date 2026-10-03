'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, projectMembersApi } from '@/lib/api';

export interface UserMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceMembers?: Array<{ role: string; workspaceId: string }>;
  projectMembers?: Array<{ role: string; projectId: string }>;
}

export interface ProjectMemberItem {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  projectId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
}

export function useUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await usersApi.getAll(params);
      return res.data;
    },
  });
}

export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await projectMembersApi.getAll(projectId);
      return res.data as ProjectMemberItem[];
    },
    enabled: Boolean(projectId),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await usersApi.update(id, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['project-members'] });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      userIdOrEmail,
      role,
    }: {
      projectId: string;
      userIdOrEmail: string;
      role: string;
    }) => {
      const res = await projectMembersApi.add(projectId, { userIdOrEmail, role });
      return res.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: string;
    }) => {
      const res = await projectMembersApi.updateRole(projectId, userId, role);
      return res.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const res = await projectMembersApi.remove(projectId, userId);
      return res.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
