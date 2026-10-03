import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, NotificationType, Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import {
  QueryTasksDto,
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTasksDto,
  BulkUpdateTasksDto,
} from './dto/tasks.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(reporterId: string, dto: CreateTaskDto) {
    const { labelIds, ...taskData } = dto;

    const created = await this.prisma.$transaction(async (tx) => {
      // Get next task number for the project
      const project = await tx.project.findUnique({
        where: { id: dto.projectId },
        select: { key: true, _count: { select: { tasks: true } } },
      });

      if (!project) throw new NotFoundException('Project not found');

      const taskNumber = project._count.tasks + 1;

      const task = await tx.task.create({
        data: {
          ...taskData,
          taskNumber,
          reporterId,
        },
      });

      if (labelIds && labelIds.length > 0) {
        await tx.taskLabel.createMany({
          data: labelIds.map((labelId) => ({
            taskId: task.id,
            labelId,
          })),
        });
      }

      return task;
    });

    const createdTask = await this.findOne(created.id);

    void this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'Task',
      entityId: createdTask.id,
      actorId: reporterId,
      diff: { title: createdTask.title, status: createdTask.status, priority: createdTask.priority },
      metadata: {
        taskKey: `${createdTask.project?.key || 'TASK'}-${createdTask.taskNumber}`,
        taskTitle: createdTask.title,
        projectName: createdTask.project?.name,
      },
    });

    if (createdTask.assigneeId && createdTask.assigneeId !== reporterId) {
      void this.notificationsService.create({
        userId: createdTask.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: `You were assigned to "${createdTask.title}" (${createdTask.project.key}-${createdTask.taskNumber})`,
        data: { taskId: createdTask.id, projectId: createdTask.projectId },
      });
    }

    this.notificationsGateway.broadcastTaskUpdate(createdTask.projectId, {
      action: 'created',
      task: createdTask,
    });

    return createdTask;
  }

  async findAll(query: QueryTasksDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      projectId,
      statuses,
      priorities,
      assignees,
      labels,
      sprintId,
    } = query;

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(projectId && { projectId }),
      ...(sprintId && { sprintId }),
      ...(statuses?.length && { status: { in: statuses } }),
      ...(priorities?.length && { priority: { in: priorities } }),
      ...(assignees?.length && { assigneeId: { in: assignees } }),
      ...(labels?.length && {
        taskLabels: {
          some: { labelId: { in: labels } },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          // allow searching by exact task key (e.g. PF-123)
          {
            project: {
              is: {
                key: { contains: search.split('-')[0], mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          project: {
            select: { id: true, key: true, name: true },
          },
          taskLabels: {
            include: {
              label: true,
            },
          },
          sprint: {
            select: { id: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        project: {
          select: { id: true, key: true, name: true },
        },
        taskLabels: {
          include: {
            label: true,
          },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId?: string) {
    const { labelIds, ...taskData } = dto;
    const previous = await this.findOne(id); // verify existence

    const updateData: Prisma.TaskUpdateInput = { ...taskData };

    if (taskData.status === TaskStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (taskData.status) {
      updateData.completedAt = null;
    }

    await this.prisma.$transaction(async (tx) => {
      if (labelIds !== undefined) {
        // Replace all labels
        await tx.taskLabel.deleteMany({ where: { taskId: id } });
        if (labelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: labelIds.map((labelId) => ({ taskId: id, labelId })),
          });
        }
      }

      await tx.task.update({
        where: { id },
        data: updateData,
      });
    });

    const updated = await this.findOne(id);

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.title && dto.title !== previous.title) {
      diff.title = { from: previous.title, to: dto.title };
    }
    if (dto.status && dto.status !== previous.status) {
      diff.status = { from: previous.status, to: dto.status };
    }
    if (dto.priority && dto.priority !== previous.priority) {
      diff.priority = { from: previous.priority, to: dto.priority };
    }
    if (dto.description !== undefined && dto.description !== previous.description) {
      const prevDesc = previous.description ? (previous.description.length > 60 ? `${previous.description.slice(0, 60)}...` : previous.description) : 'None';
      const newDesc = dto.description ? (dto.description.length > 60 ? `${dto.description.slice(0, 60)}...` : dto.description) : 'None';
      diff.description = { from: prevDesc, to: newDesc };
    }
    if (dto.storyPoints !== undefined && dto.storyPoints !== previous.storyPoints) {
      diff.storyPoints = {
        from: previous.storyPoints ?? 'None',
        to: dto.storyPoints ?? 'None',
      };
    }
    if (dto.dueDate !== undefined) {
      const prevDate = previous.dueDate ? new Date(previous.dueDate).toISOString().slice(0, 10) : null;
      const newDate = dto.dueDate ? new Date(dto.dueDate).toISOString().slice(0, 10) : null;
      if (prevDate !== newDate) {
        diff.dueDate = { from: prevDate ?? 'None', to: newDate ?? 'None' };
      }
    }
    if (dto.startDate !== undefined) {
      const prevDate = previous.startDate ? new Date(previous.startDate).toISOString().slice(0, 10) : null;
      const newDate = dto.startDate ? new Date(dto.startDate).toISOString().slice(0, 10) : null;
      if (prevDate !== newDate) {
        diff.startDate = { from: prevDate ?? 'None', to: newDate ?? 'None' };
      }
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== previous.assigneeId) {
      const prevName = previous.assignee ? `${previous.assignee.firstName} ${previous.assignee.lastName}` : 'Unassigned';
      const newName = updated.assignee ? `${updated.assignee.firstName} ${updated.assignee.lastName}` : 'Unassigned';
      diff.assignee = { from: prevName, to: newName };
    }
    if (dto.sprintId !== undefined && dto.sprintId !== previous.sprintId) {
      const prevSprint = previous.sprint?.name ?? 'Backlog';
      const newSprint = updated.sprint?.name ?? 'Backlog';
      diff.sprint = { from: prevSprint, to: newSprint };
    }
    if (labelIds !== undefined) {
      const prevLabels = previous.taskLabels.map((tl) => tl.label.name).sort().join(', ') || 'None';
      const newLabels = updated.taskLabels.map((tl) => tl.label.name).sort().join(', ') || 'None';
      if (prevLabels !== newLabels) {
        diff.labels = { from: prevLabels, to: newLabels };
      }
    }

    if (Object.keys(diff).length > 0) {
      void this.auditLogsService.create({
        action: dto.status && dto.status !== previous.status ? AuditAction.STATUS_CHANGE : AuditAction.UPDATE,
        entityType: 'Task',
        entityId: id,
        actorId: userId,
        diff,
        metadata: {
          taskKey: `${updated.project?.key || 'TASK'}-${updated.taskNumber}`,
          taskTitle: updated.title,
          projectName: updated.project?.name,
        },
      });
    }

    if (dto.assigneeId && dto.assigneeId !== previous.assigneeId && dto.assigneeId !== userId) {
      void this.notificationsService.create({
        userId: dto.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: `You were assigned to "${updated.title}" (${updated.project.key}-${updated.taskNumber})`,
        data: { taskId: updated.id, projectId: updated.projectId },
      });
    }

    this.notificationsGateway.broadcastTaskUpdate(updated.projectId, {
      action: 'updated',
      task: updated,
    });

    return updated;
  }

  async softDelete(id: string, userId?: string) {
    const task = await this.findOne(id);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    void this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'Task',
      entityId: id,
      actorId: userId,
      diff: { title: task.title },
      metadata: {
        taskKey: `${task.project?.key || 'TASK'}-${task.taskNumber}`,
        taskTitle: task.title,
        projectName: task.project?.name,
      },
    });

    this.notificationsGateway.broadcastTaskUpdate(task.projectId, {
      action: 'deleted',
      taskId: id,
    });

    return { message: `Task "${id}" deleted` };
  }

  async reorder(dto: ReorderTasksDto) {
    const results = await this.prisma.$transaction(
      dto.items.map((item) => {
        const data: Prisma.TaskUpdateInput = {
          position: item.position,
        };

        if (item.status !== undefined) {
          data.status = item.status;
          if (item.status === TaskStatus.DONE) {
            data.completedAt = new Date();
          } else {
            data.completedAt = null;
          }
        }

        if (item.sprintId !== undefined) {
          data.sprint = item.sprintId
            ? { connect: { id: item.sprintId } }
            : { disconnect: true };
        }

        return this.prisma.task.update({
          where: { id: item.id },
          data,
        });
      }),
    );

    if (dto.items.length > 0) {
      const sample = await this.prisma.task.findUnique({
        where: { id: dto.items[0].id },
        select: { projectId: true },
      });
      if (sample) {
        this.notificationsGateway.broadcastTaskUpdate(sample.projectId, {
          action: 'reordered',
          items: dto.items,
        });
      }
    }

    return results;
  }

  async bulkUpdate(dto: BulkUpdateTasksDto) {
    const { taskIds, status, priority, assigneeId, sprintId } = dto;
    if (!taskIds.length) return { count: 0 };

    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const id of taskIds) {
        const data: Prisma.TaskUpdateInput = {};

        if (status !== undefined) {
          data.status = status;
          if (status === TaskStatus.DONE) {
            data.completedAt = new Date();
          } else {
            data.completedAt = null;
          }
        }

        if (priority !== undefined) {
          data.priority = priority;
        }

        if (assigneeId !== undefined) {
          data.assignee = assigneeId
            ? { connect: { id: assigneeId } }
            : { disconnect: true };
        }

        if (sprintId !== undefined) {
          data.sprint = sprintId
            ? { connect: { id: sprintId } }
            : { disconnect: true };
        }

        await tx.task.update({
          where: { id },
          data,
        });
        count++;
      }
      return { count };
    });
  }

  async bulkDelete(taskIds: string[]) {
    if (!taskIds.length) return { count: 0 };

    return this.prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }
}

