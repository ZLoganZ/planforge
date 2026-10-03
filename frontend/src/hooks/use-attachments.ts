import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { attachmentsApi } from "@/lib/api";

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  taskId: string;
  uploadedAt: string;
}

export function useAttachments(taskId?: string) {
  return useQuery<Attachment[]>({
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await attachmentsApi.getByTask(taskId);
      return res.data;
    },
    enabled: Boolean(taskId),
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const res = await attachmentsApi.upload(taskId, file);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; taskId: string }) => {
      const res = await attachmentsApi.delete(id);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export async function downloadAttachment(id: string, fileName: string) {
  const res = await attachmentsApi.getSignedUrl(id);
  const downloadUrl = res.data.url;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Download request failed");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    // Direct trigger fallback
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
