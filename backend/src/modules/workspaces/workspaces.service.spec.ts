import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { WorkspacesService } from './workspaces.service.js';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      workspace: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workspaceMember: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    service = new WorkspacesService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return workspaces for a user', async () => {
      const mockWorkspaces = [
        {
          id: 'ws-1',
          name: 'PlanForge Core',
          slug: 'planforge-core',
          _count: { members: 3, projects: 2 },
        },
      ];
      prisma.workspace.findMany.mockResolvedValue(mockWorkspaces);

      const result = await service.findAll('user-1');
      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: 'user-1' } } },
        include: { _count: { select: { members: true, projects: true } } },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockWorkspaces);
    });
  });

  describe('findOne', () => {
    it('should return workspace details when found', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        name: 'PlanForge',
        slug: 'planforge',
        members: [],
        projects: [],
      };
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.findOne('ws-1');
      expect(result).toEqual(mockWorkspace);
    });

    it('should throw NotFoundException when workspace is not found', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should throw ConflictException if slug already exists', async () => {
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'existing-ws',
        slug: 'planforge',
      });

      await expect(
        service.create('user-1', { name: 'PlanForge', slug: 'planforge' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create workspace and assign creator as OWNER', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      const createdWs = {
        id: 'ws-new',
        name: 'New Project',
        slug: 'new-project',
      };
      prisma.workspace.create.mockResolvedValue(createdWs);
      prisma.workspaceMember.create.mockResolvedValue({});

      const result = await service.create('user-1', {
        name: 'New Project',
        slug: 'new-project',
      });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: {
          name: 'New Project',
          slug: 'new-project',
          description: undefined,
          logoUrl: undefined,
        },
      });
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-new',
          userId: 'user-1',
          role: Role.OWNER,
        },
      });
      expect(result).toEqual(createdWs);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user is not OWNER or ADMIN', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: Role.MEMBER,
      });

      await expect(
        service.update('ws-1', { name: 'Updated' }, 'member-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update workspace when user is ADMIN or OWNER', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: Role.ADMIN });
      prisma.workspace.update.mockResolvedValue({
        id: 'ws-1',
        name: 'Updated',
      });

      const result = await service.update(
        'ws-1',
        { name: 'Updated' },
        'admin-user',
      );
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });
  });

  describe('addMember', () => {
    it('should throw ForbiddenException if requester is not OWNER or ADMIN', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValueOnce({
        role: Role.MEMBER,
      });

      await expect(
        service.addMember(
          'ws-1',
          { userId: 'new-user', role: Role.MEMBER },
          'member-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if ADMIN tries to add member as OWNER', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValueOnce({
        role: Role.ADMIN,
      });

      await expect(
        service.addMember(
          'ws-1',
          { userId: 'new-user', role: Role.OWNER },
          'admin-user',
        ),
      ).rejects.toThrow('Only workspace owners can add members as OWNER');
    });

    it('should throw ConflictException if user is already a member', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ role: Role.OWNER }) // Requester
        .mockResolvedValueOnce({ id: 'existing-mem' }); // Target member

      await expect(
        service.addMember(
          'ws-1',
          { userId: 'existing-user', role: Role.MEMBER },
          'owner-user',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateMemberRole', () => {
    it('should prevent self-changing of role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: Role.ADMIN,
      });

      await expect(
        service.updateMemberRole(
          'ws-1',
          'user-1',
          { role: Role.OWNER },
          'user-1',
        ),
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should prevent demoting the OWNER', async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({
          id: 'mem-owner',
          userId: 'owner-id',
          role: Role.OWNER,
        }) // Target
        .mockResolvedValueOnce({ role: Role.OWNER }); // Requester

      await expect(
        service.updateMemberRole(
          'ws-1',
          'owner-id',
          { role: Role.ADMIN },
          'owner-id-2',
        ),
      ).rejects.toThrow('Cannot demote workspace owner');
    });

    it('should prevent ADMIN from changing another ADMIN role', async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({
          id: 'mem-admin',
          userId: 'admin-2',
          role: Role.ADMIN,
        }) // Target
        .mockResolvedValueOnce({ role: Role.ADMIN }); // Requester

      await expect(
        service.updateMemberRole(
          'ws-1',
          'admin-2',
          { role: Role.MEMBER },
          'admin-1',
        ),
      ).rejects.toThrow('Admins cannot change roles of other admins');
    });

    it('should allow OWNER to change member role', async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({
          id: 'mem-target',
          userId: 'member-1',
          role: Role.MEMBER,
        }) // Target
        .mockResolvedValueOnce({ role: Role.OWNER }); // Requester
      prisma.workspaceMember.update.mockResolvedValue({
        id: 'mem-target',
        role: Role.ADMIN,
        user: { id: 'member-1', email: 'member@planforge.dev' },
      });

      const result = await service.updateMemberRole(
        'ws-1',
        'member-1',
        { role: Role.ADMIN },
        'owner-id',
      );

      expect(prisma.workspaceMember.update).toHaveBeenCalled();
      expect(result.role).toBe(Role.ADMIN);
    });
  });

  describe('removeMember', () => {
    it('should prevent removing the workspace owner', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: 'mem-owner',
        userId: 'owner-id',
        role: Role.OWNER,
      });

      await expect(
        service.removeMember('ws-1', 'owner-id', 'admin-id'),
      ).rejects.toThrow('Cannot remove the workspace owner');
    });

    it('should prevent non-admin/owner from removing others', async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({
          id: 'mem-other',
          userId: 'other-id',
          role: Role.MEMBER,
        }) // Target
        .mockResolvedValueOnce({ role: Role.MEMBER }); // Requester

      await expect(
        service.removeMember('ws-1', 'other-id', 'member-id'),
      ).rejects.toThrow('Only workspace owners and admins can remove members');
    });

    it('should prevent ADMIN from removing another ADMIN', async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({
          id: 'mem-admin2',
          userId: 'admin-2',
          role: Role.ADMIN,
        }) // Target
        .mockResolvedValueOnce({ role: Role.ADMIN }); // Requester

      await expect(
        service.removeMember('ws-1', 'admin-2', 'admin-1'),
      ).rejects.toThrow('Admins cannot remove other admins');
    });

    it('should allow a non-owner member to remove themselves (leave workspace)', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: 'mem-member',
        userId: 'member-id',
        role: Role.MEMBER,
      });
      prisma.workspaceMember.delete.mockResolvedValue({});

      await service.removeMember('ws-1', 'member-id', 'member-id');
      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'member-id' },
        },
      });
    });
  });

  describe('remove workspace', () => {
    it('should prevent non-owner from deleting workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: Role.ADMIN });

      await expect(service.remove('ws-1', 'admin-id')).rejects.toThrow(
        'Only the workspace owner can delete the workspace',
      );
    });

    it('should allow owner to delete workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: Role.OWNER });
      prisma.workspace.delete.mockResolvedValue({});

      await service.remove('ws-1', 'owner-id');
      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });
  });
});
