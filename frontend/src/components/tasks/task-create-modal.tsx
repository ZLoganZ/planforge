"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useProjectMembers, UserMember, useUsers } from "@/hooks/use-members";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";
import { getErrorMessage } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]),
  assigneeId: z.string().optional(),
  storyPoints: z.number().min(0).optional(),
  dueDate: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskCreateModalProps {
  children?: React.ReactNode;
  projectId?: string;
  defaultStatus?: string;
  defaultSprintId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskCreateModal({
  children,
  projectId: initialProjectId,
  defaultStatus = "TODO",
  defaultSprintId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TaskCreateModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen =
    controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = setControlledOpen || setUncontrolledOpen;

  const { data: projectsData } = useProjects();
  const projects = React.useMemo(
    () => (Array.isArray(projectsData?.items) ? projectsData.items : []),
    [projectsData]
  );

  const isProjectFixed = Boolean(
    initialProjectId && initialProjectId !== "global"
  );

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");

  const activeProjectId =
    (isProjectFixed ? initialProjectId : selectedProjectId) ||
    projects[0]?.id ||
    "";

  const { mutateAsync: createTask, isPending } = useCreateTask();

  const { data: projectMembers = [] } = useProjectMembers(
    activeProjectId || undefined
  );
  const { data: usersData } = useUsers();

  const assignableUsers = React.useMemo(() => {
    const list: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      initials: string;
    }[] = [];
    const seen = new Set<string>();

    if (projectMembers && projectMembers.length > 0) {
      projectMembers.forEach((m) => {
        if (m.user && !seen.has(m.user.id)) {
          seen.add(m.user.id);
          list.push({
            id: m.user.id,
            name:
              `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
            avatarUrl: m.user.avatarUrl,
            initials:
              `${m.user.firstName?.[0] || ""}${m.user.lastName?.[0] || ""}`.toUpperCase(),
          });
        }
      });
    }

    if (usersData?.items) {
      usersData.items.forEach((u: UserMember) => {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          list.push({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim() || u.email,
            avatarUrl: u.avatarUrl,
            initials:
              `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase(),
          });
        }
      });
    }

    return list;
  }, [projectMembers, usersData]);

  const validStatus = (
    ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(
      defaultStatus
    )
      ? defaultStatus
      : "TODO"
  ) as "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: validStatus,
      priority: "MEDIUM",
      assigneeId: "unassigned",
      storyPoints: 0,
      dueDate: null,
    },
  });

  React.useEffect(() => {
    if (defaultStatus) {
      const statusValue = (
        ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(
          defaultStatus
        )
          ? defaultStatus
          : "TODO"
      ) as "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
      form.setValue("status", statusValue);
    }
  }, [defaultStatus, form]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!activeProjectId) {
      alert("Please select or create a project first.");
      return;
    }
    try {
      await createTask({
        ...data,
        assigneeId:
          data.assigneeId === "unassigned" ? undefined : data.assigneeId,
        projectId: activeProjectId,
        sprintId: defaultSprintId,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
      } as unknown as Parameters<typeof createTask>[0]);
      setIsOpen(false);
      form.reset();
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Failed to create task", error);
      toast.error(getErrorMessage(error, "Failed to create task"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isProjectFixed && projects.length > 0 && (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select
                  value={activeProjectId}
                  onValueChange={(val) => setSelectedProjectId(val)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BACKLOG">Backlog</SelectItem>
                        <SelectItem value="TODO">Todo</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-muted-foreground italic">
                            Unassigned
                          </span>
                        </SelectItem>
                        {assignableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-4">
                                {u.avatarUrl && (
                                  <AvatarImage src={u.avatarUrl} alt={u.name} />
                                )}
                                <AvatarFallback className="bg-primary/20 text-[9px] font-semibold text-primary">
                                  {u.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span>{u.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storyPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Due Date</FormLabel>
                  <DatePicker
                    id="task-due-date"
                    date={field.value || undefined}
                    onSelect={(date) => field.onChange(date || null)}
                    placeholder="Pick a due date"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
