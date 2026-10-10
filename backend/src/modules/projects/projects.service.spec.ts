import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      projectMember: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    service = new ProjectsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should throw ConflictException if project key already exists in workspace', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'existing-proj',
        key: 'PLN',
        workspaceId: 'ws-1',
      });

      await expect(
        service.create('user-1', {
          name: 'PlanForge Core',
          key: 'PLN',
          workspaceId: 'ws-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create project and assign creator as OWNER in transaction', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      const mockCreated = {
        id: 'proj-1',
        name: 'PlanForge Core',
        key: 'PLN',
        workspaceId: 'ws-1',
      };
      prisma.project.create.mockResolvedValue(mockCreated);
      prisma.projectMember.create.mockResolvedValue({});

      const result = await service.create('user-1', {
        name: 'PlanForge Core',
        key: 'PLN',
        workspaceId: 'ws-1',
      });

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'PlanForge Core',
          key: 'PLN',
          workspaceId: 'ws-1',
        },
      });
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          userId: 'user-1',
          role: 'OWNER',
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of projects', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'PlanForge Core',
          key: 'PLN',
          _count: { tasks: 12, members: 3 },
        },
      ];

      prisma.project.findMany.mockResolvedValue(mockProjects);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        workspaceId: 'ws-1',
      });

      expect(prisma.project.findMany).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return project details when found', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'PlanForge Core',
        key: 'PLN',
      };
      prisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('proj-1');
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project is missing', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.project.update.mockResolvedValue({
        id: 'proj-1',
        name: 'Updated Name',
      });

      const result = await service.update('proj-1', { name: 'Updated Name' });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should delete project by id', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.project.delete.mockResolvedValue({ id: 'proj-1' });

      await service.remove('proj-1');
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });
  });
});
