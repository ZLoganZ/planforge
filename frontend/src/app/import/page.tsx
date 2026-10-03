"use client";

import React, { useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Import,
  Loader2,
  Table as TableIcon,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  exportTasksAsCsv,
  ImportJob,
  useImportJobs,
  usePreviewCsv,
  useStartTaskImport,
} from "@/hooks/use-import-export";
import { useProjects } from "@/hooks/use-projects";
import { cn, getErrorMessage } from "@/lib/utils";

export default function ImportExportPage() {
  const { data: projectsData } = useProjects();
  const projects = projectsData?.items || [];

  const { data: jobs = [], isLoading: loadingJobs } = useImportJobs();
  const previewCsv = usePreviewCsv();
  const startImport = useStartTaskImport();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [exportProjectId, setExportProjectId] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    totalRows: number;
    sample: Record<string, string>[];
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedJobForErrors, setSelectedJobForErrors] =
    useState<ImportJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Only .csv files are supported.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedFile(file);

    try {
      const preview = await previewCsv.mutateAsync(file);
      setCsvPreview(preview);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to parse CSV preview."));
      setSelectedFile(null);
      setCsvPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleStartImport = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select a CSV file first.");
      return;
    }
    if (!selectedProjectId) {
      setErrorMsg("Please select a target project.");
      return;
    }

    setErrorMsg(null);
    try {
      await startImport.mutateAsync({
        file: selectedFile,
        projectId: selectedProjectId,
      });
      setSuccessMsg(
        `Import job created for "${selectedFile.name}". Processing in background.`
      );
      toast.success(`Import job created for "${selectedFile.name}"`);
      setSelectedFile(null);
      setCsvPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to start import.");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setErrorMsg(null);
      await exportTasksAsCsv(
        exportProjectId === "all" ? undefined : exportProjectId
      );
      toast.success("Tasks exported to CSV successfully");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to export tasks.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setCsvPreview(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Import & Export
          </h1>
          <p className="text-sm text-muted-foreground">
            Bulk import tasks via CSV files or export existing project data for
            reporting and backup.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setErrorMsg(null)}
              className="size-6 text-destructive hover:bg-transparent hover:text-destructive/80"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSuccessMsg(null)}
              className="size-6 text-emerald-600 hover:bg-transparent hover:opacity-80 dark:text-emerald-400"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Import Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Import className="size-4 text-primary" />
                Import Tasks from CSV
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a CSV file containing task records. Supported columns:
                title, description, status, priority, storyPoints, dueDate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select target project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dropzone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="size-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Click to browse or drag and drop your CSV file here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CSV format only, up to 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <FileSpreadsheet className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                          {csvPreview?.totalRows ?? "..."} rows detected
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="size-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {/* CSV Preview */}
                  {previewCsv.isPending ? (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                      Parsing CSV structure...
                    </div>
                  ) : csvPreview ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Headers:
                        </span>
                        {csvPreview.headers.map((h) => (
                          <Badge
                            key={h}
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            {h}
                          </Badge>
                        ))}
                      </div>

                      {csvPreview.sample.length > 0 && (
                        <div className="overflow-x-auto rounded-md border border-border bg-background">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-muted/50 text-muted-foreground">
                              <tr>
                                {csvPreview.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="px-2.5 py-1.5 font-medium whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {csvPreview.sample.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  {csvPreview.headers.map((h) => (
                                    <td
                                      key={h}
                                      className="max-w-40 truncate px-2.5 py-1 text-foreground"
                                    >
                                      {row[h] || "-"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleStartImport}
                      disabled={
                        startImport.isPending ||
                        !selectedProjectId ||
                        previewCsv.isPending
                      }
                      className="gap-1.5 text-xs"
                    >
                      {startImport.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Import className="size-3.5" />
                      )}
                      Import {csvPreview?.totalRows || ""} Tasks
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Download className="size-4 text-primary" />
                Export Tasks
              </CardTitle>
              <CardDescription className="text-xs">
                Download tasks data in CSV format for analysis or reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Project</Label>
                <Select
                  value={exportProjectId}
                  onValueChange={setExportProjectId}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Projects
                    </SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Included Fields:</p>
                <p className="text-[11px]">
                  ID, Task Number, Title, Description, Status, Priority, Story
                  Points, Due Date, Project, Assignee, Created Date.
                </p>
              </div>

              <Button
                className="w-full gap-2 text-xs"
                variant="outline"
                disabled={isExporting}
                onClick={handleExport}
              >
                {isExporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="size-3.5" />
                )}
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Import Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <TableIcon className="size-4 text-primary" />
                  Recent Import Jobs
                </CardTitle>
                <CardDescription className="text-xs">
                  History of task import operations with real-time processing
                  status.
                </CardDescription>
              </div>
              {jobs.some(
                (j) => j.status === "PENDING" || j.status === "PROCESSING"
              ) && (
                <Badge
                  variant="secondary"
                  className="animate-pulse gap-1 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                >
                  <Loader2 className="size-3 animate-spin" />
                  Processing
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                Loading import history...
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                No import jobs executed yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">File Name</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Progress</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobs.map((job) => {
                      const percent =
                        job.totalRows > 0
                          ? Math.round(
                              (job.processedRows / job.totalRows) * 100
                            )
                          : 0;

                      return (
                        <tr key={job.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <FileText className="size-3.5 text-muted-foreground" />
                              <span className="max-w-44 truncate">
                                {job.fileName}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {format(new Date(job.createdAt), "MMM d, h:mm a")}
                          </td>
                          <td className="px-3 py-2.5">
                            {job.status === "COMPLETED" && (
                              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                                Completed
                              </Badge>
                            )}
                            {job.status === "PROCESSING" && (
                              <Badge className="animate-pulse border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600 dark:text-blue-400">
                                Processing
                              </Badge>
                            )}
                            {job.status === "PENDING" && (
                              <Badge className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                                Pending
                              </Badge>
                            )}
                            {job.status === "FAILED" && (
                              <Badge className="border-destructive/20 bg-destructive/10 text-[10px] text-destructive">
                                Failed
                              </Badge>
                            )}
                          </td>
                          <td className="min-w-32 px-3 py-2.5">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>
                                  {job.processedRows} / {job.totalRows}
                                </span>
                                <span>{percent}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full transition-all duration-300",
                                    job.status === "FAILED"
                                      ? "bg-destructive"
                                      : "bg-primary"
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="text-[11px]">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                +{job.successRows}
                              </span>
                              {job.errorRows > 0 && (
                                <span className="ml-1.5 font-medium text-destructive">
                                  -{job.errorRows} err
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {job.errorLog && job.errorLog.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                                onClick={() => setSelectedJobForErrors(job)}
                              >
                                View Errors ({job.errorLog.length})
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                None
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Details Modal */}
        {selectedJobForErrors && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-destructive" />
                  <h3 className="text-sm font-bold text-foreground">
                    Import Errors: {selectedJobForErrors.fileName}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={() => setSelectedJobForErrors(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {selectedJobForErrors.errorLog?.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-foreground"
                  >
                    <span className="font-semibold text-destructive">
                      Row {err.row}:
                    </span>{" "}
                    <span className="text-muted-foreground">{err.error}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setSelectedJobForErrors(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
