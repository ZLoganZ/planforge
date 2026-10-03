import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface ImportJob {
  id: string;
  fileName: string;
  fileUrl: string | null;
  entityType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  errorLog: { row: number; error: string }[] | null;
  createdAt: string;
}

export interface CsvPreview {
  headers: string[];
  totalRows: number;
  sample: Record<string, string>[];
}

export function useImportJobs() {
  return useQuery({
    queryKey: ["import-jobs"],
    queryFn: async () => {
      const res = await api.get<ImportJob[]>("/import-export/jobs");
      return res.data;
    },
    refetchInterval: (query) => {
      // Poll if any job is still pending or processing
      const hasActive = query.state.data?.some(
        (j) => j.status === "PENDING" || j.status === "PROCESSING"
      );
      return hasActive ? 2000 : false;
    },
  });
}

export function useImportJob(id?: string) {
  return useQuery({
    queryKey: ["import-jobs", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<ImportJob>(`/import-export/jobs/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 1500 : false;
    },
  });
}

export function usePreviewCsv() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<CsvPreview>(
        "/import-export/preview",
        formData
      );
      return res.data;
    },
  });
}

export function useStartTaskImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      projectId,
    }: {
      file: File;
      projectId: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      const res = await api.post<ImportJob>("/import-export/tasks", formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export async function exportTasksAsCsv(projectId?: string) {
  const query = projectId ? `?projectId=${projectId}` : "";
  const res = await api.get<Blob>(`/import-export/tasks/export${query}`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], {
    type: "text/csv;charset=utf-8;",
  });
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}
