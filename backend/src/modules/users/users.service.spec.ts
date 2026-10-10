import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      workspaceMember: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      workspace: {
        findFirst: vi.fn(),
      },
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated list of users with roles', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@planforge.dev',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          workspaceMembers: [{ role: Role.OWNER, workspaceId: 'ws-1' }],
          projectMembers: [],
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'admin',
      });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].role).toBe(Role.OWNER);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return user with workspace role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@planforge.dev',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceMembers: [
          {
            role: Role.ADMIN,
            workspaceId: 'ws-1',
            workspace: { id: 'ws-1', name: 'PlanForge', slug: 'planforge' },
          },
        ],
        projectMembers: [],
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');
      expect(result.id).toBe('user-1');
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - RBAC and validation', () => {
    const ownerUser = {
      id: 'owner-id',
      email: 'owner@planforge.dev',
      workspaceMembers: [{ role: Role.OWNER, workspaceId: 'ws-1' }],
      projectMembers: [],
    };

    const adminUser = {
      id: 'admin-id',
      email: 'admin@planforge.dev',
      workspaceMembers: [{ role: Role.ADMIN, workspaceId: 'ws-1' }],
      projectMembers: [],
    };

    const memberUser = {
      id: 'member-id',
      email: 'member@planforge.dev',
      workspaceMembers: [{ role: Role.MEMBER, workspaceId: 'ws-1' }],
      projectMembers: [],
    };

    it('should prevent deactivating workspace owner account', async () => {
      prisma.user.findUnique.mockResolvedValue(ownerUser);

      await expect(
        service.update('owner-id', { isActive: false }, 'admin-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent a user from changing their own role', async () => {
      prisma.user.findUnique.mockResolvedValue(memberUser);

      await expect(
        service.update('member-id', { role: Role.ADMIN }, 'member-id'),
      ).rejects.toThrow('You cannot change your own role');
    });

    it('should prevent a user from deactivating their own account', async () => {
      prisma.user.findUnique.mockResolvedValue(memberUser);

      await expect(
        service.update('member-id', { isActive: false }, 'member-id'),
      ).rejects.toThrow('You cannot deactivate your own account');
    });

    it('should prevent regular members from updating other users', async () => {
      prisma.user.findUnique.mockResolvedValue(adminUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.MEMBER },
      ]);

      await expect(
        service.update('admin-id', { firstName: 'Hacked' }, 'member-id'),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent admins from modifying owner accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(ownerUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.ADMIN },
      ]);

      await expect(
        service.update('owner-id', { firstName: 'NewName' }, 'admin-id'),
      ).rejects.toThrow('Admins cannot modify workspace owners');
    });

    it('should prevent admins from modifying other admin accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(adminUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.ADMIN },
      ]);

      await expect(
        service.update(
          'admin-id',
          { firstName: 'NewName' },
          'another-admin-id',
        ),
      ).rejects.toThrow('Admins cannot modify other admins');
    });

    it('should prevent admins from assigning OWNER role', async () => {
      prisma.user.findUnique.mockResolvedValue(memberUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.ADMIN },
      ]);

      await expect(
        service.update('member-id', { role: Role.OWNER }, 'admin-id'),
      ).rejects.toThrow('Only workspace owners can assign the OWNER role');
    });

    it('should allow OWNER to update member role and details', async () => {
      prisma.user.findUnique.mockResolvedValue(memberUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.OWNER },
      ]);
      prisma.workspaceMember.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({
        id: 'member-id',
        email: 'member@planforge.dev',
        firstName: 'Updated',
        lastName: 'Member',
        avatarUrl: null,
        isActive: true,
        updatedAt: new Date(),
        workspaceMembers: [{ role: Role.ADMIN, workspaceId: 'ws-1' }],
      });

      const updated = await service.update(
        'member-id',
        { firstName: 'Updated', role: Role.ADMIN },
        'owner-id',
      );

      expect(prisma.workspaceMember.updateMany).toHaveBeenCalledWith({
        where: { userId: 'member-id', workspaceId: 'ws-1' },
        data: { role: Role.ADMIN },
      });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(updated.role).toBe(Role.ADMIN);
    });
  });

  describe('softDelete', () => {
    it('should prevent deleting the workspace owner', async () => {
      const ownerUser = {
        id: 'owner-id',
        workspaceMembers: [{ role: Role.OWNER, workspaceId: 'ws-1' }],
        projectMembers: [],
      };
      prisma.user.findUnique.mockResolvedValue(ownerUser);

      await expect(service.softDelete('owner-id', 'admin-id')).rejects.toThrow(
        'Cannot delete workspace owner account',
      );
    });

    it('should prevent self-deletion', async () => {
      const memberUser = {
        id: 'member-id',
        workspaceMembers: [{ role: Role.MEMBER, workspaceId: 'ws-1' }],
        projectMembers: [],
      };
      prisma.user.findUnique.mockResolvedValue(memberUser);

      await expect(
        service.softDelete('member-id', 'member-id'),
      ).rejects.toThrow('Cannot delete your own account via this endpoint');
    });

    it('should prevent non-admin/owner from deleting users', async () => {
      const targetUser = {
        id: 'target-id',
        workspaceMembers: [{ role: Role.MEMBER, workspaceId: 'ws-1' }],
        projectMembers: [],
      };
      prisma.user.findUnique.mockResolvedValue(targetUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.MEMBER },
      ]);

      await expect(
        service.softDelete('target-id', 'member-id'),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should successfully soft-delete user when authorized', async () => {
      const targetUser = {
        id: 'target-id',
        workspaceMembers: [{ role: Role.MEMBER, workspaceId: 'ws-1' }],
        projectMembers: [],
      };
      prisma.user.findUnique.mockResolvedValue(targetUser);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.OWNER },
      ]);
      prisma.user.update.mockResolvedValue({});

      const result = await service.softDelete('target-id', 'owner-id');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'target-id' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result.message).toContain('deleted');
    });
  });

  describe('invite', () => {
    it('should prevent non-admin/owner from inviting users', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.MEMBER },
      ]);

      await expect(
        service.invite({ email: 'new@planforge.dev' }, 'member-id'),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent admin from inviting a user as OWNER', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', role: Role.ADMIN },
      ]);

      await expect(
        service.invite(
          { email: 'new@planforge.dev', role: Role.OWNER },
          'admin-id',
        ),
      ).rejects.toThrow('Only workspace owners can invite users as OWNER');
    });
  });
});
