import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor: Attach access token ────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // For multipart/form-data, delete Content-Type so browser sets boundary
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Auto-refresh on 401 ──────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh");
        const newToken = data.data?.accessToken || data.accessToken;
        localStorage.setItem("accessToken", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        if (typeof window !== "undefined") {
          const fullPath = window.location.pathname + window.location.search;
          const callbackParam =
            fullPath && fullPath !== "/login" && fullPath !== "/register"
              ? `?callbackUrl=${encodeURIComponent(fullPath)}`
              : "";
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = `/login${callbackParam}`;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── API Methods ─────────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  refresh: () => api.post("/auth/refresh"),

  logout: () => api.post("/auth/logout"),

  getProfile: () => api.get("/auth/profile"),

  updateProfile: (data: { firstName?: string; lastName?: string }) =>
    api.patch("/auth/profile", data),
};

// Users
export const usersApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/users", { params }),

  getById: (id: string) => api.get(`/users/${id}`),

  invite: (data: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }) => api.post("/users/invite", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};

// Audit Logs
export const auditLogsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/audit-logs", { params }),

  getStats: () => api.get("/audit-logs/stats"),
};

// Notifications
export const notificationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/notifications", { params }),

  getUnreadCount: () => api.get("/notifications/unread-count"),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.post("/notifications/mark-all-read"),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Project Members
export const projectMembersApi = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/members`),

  add: (projectId: string, data: { userIdOrEmail: string; role: string }) =>
    api.post(`/projects/${projectId}/members`, data),

  updateRole: (projectId: string, userId: string, role: string) =>
    api.patch(`/projects/${projectId}/members/${userId}`, { role }),

  remove: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getStatusDistribution: () => api.get("/analytics/status-distribution"),
  getPriorityDistribution: () => api.get("/analytics/priority-distribution"),
  getVelocity: () => api.get("/analytics/velocity"),
  getMemberWorkload: () => api.get("/analytics/member-workload"),
  getRecentActivity: (limit?: number) =>
    api.get("/analytics/recent-activity", { params: { limit } }),
  getCompletionTrend: () => api.get("/analytics/completion-trend"),
  getBurndown: (sprintId: string) => api.get(`/analytics/burndown/${sprintId}`),
};

// Attachments
export const attachmentsApi = {
  getByTask: (taskId: string) => api.get(`/attachments?taskId=${taskId}`),

  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/attachments/upload?taskId=${taskId}`, formData);
  },

  getSignedUrl: (id: string) =>
    api.get<{ url: string; fileName: string }>(`/attachments/${id}/download`),

  delete: (id: string) => api.delete(`/attachments/${id}`),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/attachments/avatar", formData);
  },
};

// Tasks Export
export const tasksApi = {
  exportCsv: async (params?: Record<string, unknown>) => {
    const response = await api.get("/tasks/export", {
      params,
      responseType: "blob",
    });
    const blob = new Blob([response.data as BlobPart], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `planforge-tasks-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// Invitations
export const invitationsApi = {
  create: (data: { email: string; role?: string; workspaceId?: string }) =>
    api.post("/invitations", data),

  getAll: (workspaceId?: string) =>
    api.get("/invitations", { params: { workspaceId } }),

  validate: (token: string) =>
    api.get("/invitations/validate", { params: { token } }),

  accept: (data: {
    token: string;
    firstName: string;
    lastName?: string;
    password: string;
  }) => api.post("/invitations/accept", data),

  resend: (id: string) => api.post(`/invitations/${id}/resend`),

  revoke: (id: string) => api.delete(`/invitations/${id}`),
};
