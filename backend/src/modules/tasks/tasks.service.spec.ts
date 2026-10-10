import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TasksService } from './tasks.service.js';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;
  let auditLogsService: any;
  let notificationsService: any;
  let notificationsGateway: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
      taskLabel: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    auditLogsService = {
      create: vi.fn().mockResolvedValue({}),
    };

    notificationsService = {
      create: vi.fn().mockResolvedValue({}),
    };

    notificationsGateway = {
      broadcastTaskUpdate: vi.fn(),
    };

    service = new TasksService(
      prisma as unknown as PrismaService,
      auditLogsService as unknown as AuditLogsService,
      notificationsService as unknown as NotificationsService,
      notificationsGateway as unknown as NotificationsGateway,
    );
  });

  describe('create', () => {
    it('should throw BadRequestException when assigning to an inactive or suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-inactive',
        isActive: false,
        deletedAt: null,
      });

      await expect(
        service.create('reporter-1', {
          title: 'Implement feature',
          projectId: 'proj-1',
          assigneeId: 'user-inactive',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create task, calculate task number, and trigger notifications', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'assignee-1',
        isActive: true,
        deletedAt: null,
      });

      prisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        key: 'PLN',
        _count: { tasks: 5 },
      });

      const mockCreatedTask = {
        id: 'task-1',
        taskNumber: 6,
        title: 'Implement feature',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        projectId: 'proj-1',
        assigneeId: 'assignee-1',
        reporterId: 'reporter-1',
        project: { key: 'PLN', name: 'PlanForge' },
      };

      prisma.task.create.mockResolvedValue(mockCreatedTask);

      // findOne mock for the post-creation fetch
      vi.spyOn(service, 'findOne').mockResolvedValue(mockCreatedTask as any);

      const result = await service.create('reporter-1', {
        title: 'Implement feature',
        projectId: 'proj-1',
        assigneeId: 'assignee-1',
        priority: TaskPriority.HIGH,
      });

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Implement feature',
          taskNumber: 6,
          reporterId: 'reporter-1',
        }),
      });
      expect(auditLogsService.create).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
      expect(notificationsGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({ action: 'created' }),
      );
      expect(result).toEqual(mockCreatedTask);
    });
  });

  describe('findAll', () => {
    it('should query tasks with multifaceted filters and calculate pagination', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task One',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.URGENT,
          projectId: 'proj-1',
        },
      ];

      prisma.task.findMany.mockResolvedValue(mockTasks);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        projectId: 'proj-1',
        statuses: [TaskStatus.IN_PROGRESS],
        priorities: [TaskPriority.URGENT],
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            projectId: { in: ['proj-1'] },
            status: { in: [TaskStatus.IN_PROGRESS] },
            priority: { in: [TaskPriority.URGENT] },
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should support multi-project filtering via projectIds', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({
        projectIds: ['proj-1', 'proj-2'],
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: { in: ['proj-1', 'proj-2'] },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if task is not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return task when found', async () => {
      const mockTask = { id: 'task-1', title: 'Task One' };
      prisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne('task-1');
      expect(result).toEqual(mockTask);
    });
  });

  describe('softDelete', () => {
    it('should soft delete task and log audit trail', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task To Delete',
        projectId: 'proj-1',
        taskNumber: 3,
        project: { key: 'PLN', name: 'PlanForge' },
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(mockTask as any);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('task-1', 'user-1');

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(auditLogsService.create).toHaveBeenCalled();
      expect(notificationsGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({ action: 'deleted' }),
      );
      expect(result.message).toContain('deleted');
    });
  });
});
