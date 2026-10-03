"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invitationsApi } from "@/lib/api";

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  token: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expiresAt: string;
  invitedById: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  invitedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}

export function useInvitations(workspaceId?: string) {
  return useQuery({
    queryKey: ["invitations", workspaceId],
    queryFn: async () => {
      const res = await invitationsApi.getAll(workspaceId);
      return (res.data || []) as WorkspaceInvitation[];
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      role?: string;
      workspaceId?: string;
    }) => {
      const res = await invitationsApi.create(data);
      return res.data as WorkspaceInvitation & {
        inviteUrl: string;
        workspaceName: string;
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await invitationsApi.resend(id);
      return res.data as WorkspaceInvitation & { inviteUrl: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await invitationsApi.revoke(id);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useValidateInvitation(token: string) {
  return useQuery({
    queryKey: ["invitation-validation", token],
    queryFn: async () => {
      const res = await invitationsApi.validate(token);
      return res.data as {
        valid: boolean;
        email: string;
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
        workspace: { id: string; name: string; slug: string };
        invitedBy: { firstName: string; lastName: string; email: string };
        expiresAt: string;
      };
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      token: string;
      firstName: string;
      lastName?: string;
      password: string;
    }) => {
      const res = await invitationsApi.accept(data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: ["invitation-validation", variables.token],
      });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
