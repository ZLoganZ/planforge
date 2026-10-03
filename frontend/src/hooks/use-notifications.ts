import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { notificationsApi } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id, params],
    queryFn: async () => {
      const res = await notificationsApi.getAll(params);
      return res.data;
    },
    enabled: Boolean(user?.id),
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount();
      return (res.data as { count: number }).count;
    },
    enabled: Boolean(user?.id),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationsApi.markAsRead(id);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await notificationsApi.markAllAsRead();
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationsApi.delete(id);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}
