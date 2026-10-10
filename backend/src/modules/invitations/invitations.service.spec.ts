import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { EmailService } from '../email/email.service.js';
import { InvitationsService } from './invitations.service.js';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: any;
  let emailService: any;
  let authService: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      workspace: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      workspaceMember: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      workspaceInvitation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    emailService = {
      sendInvitationEmail: vi.fn().mockResolvedValue(true),
    };

    authService = {
      generateTokens: vi.fn().mockResolvedValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
      }),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'APP_URL') return 'http://localhost:3000';
        return defaultValue;
      }),
    };

    service = new InvitationsService(
      prisma as unknown as PrismaService,
      emailService as unknown as EmailService,
      authService as unknown as AuthService,
      configService as unknown as ConfigService,
    );
  });

  describe('create', () => {
    it('should throw ForbiddenException if requester is not OWNER or ADMIN', async () => {
      prisma.workspaceMember.findFirst.mockResolvedValue({
        workspaceId: 'ws-1',
      });
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'PlanForge',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-member',
        firstName: 'Jane',
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: Role.MEMBER,
      });

      await expect(
        service.create('user-member', {
          email: 'invitee@example.com',
          role: Role.MEMBER,
        }),
      ).rejects.toThrow('Only workspace owners and admins can invite members');
    });

    it('should throw ForbiddenException if ADMIN attempts to invite user as OWNER', async () => {
      prisma.workspaceMember.findFirst.mockResolvedValue({
        workspaceId: 'ws-1',
      });
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'PlanForge',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-admin',
        firstName: 'John',
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: Role.ADMIN });

      await expect(
        service.create('user-admin', {
          email: 'invitee@example.com',
          role: Role.OWNER,
        }),
      ).rejects.toThrow('Only workspace owners can invite users as OWNER');
    });

    it('should create invitation and send email when invited by OWNER', async () => {
      prisma.workspaceMember.findFirst
        .mockResolvedValueOnce({ workspaceId: 'ws-1' }) // Determining workspace
        .mockResolvedValueOnce(null); // Checking if invitee is already a member
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'PlanForge',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'owner-id',
        firstName: 'Owner',
        lastName: 'User',
        email: 'owner@example.com',
      }); // Inviter
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: Role.OWNER }); // Inviter membership
      prisma.workspaceInvitation.findFirst.mockResolvedValue(null); // No pending invite
      prisma.workspaceInvitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'random-token-123',
        email: 'invitee@example.com',
        role: Role.MEMBER,
        workspaceId: 'ws-1',
        workspace: { name: 'PlanForge' },
      });

      const result = await service.create('owner-id', {
        email: 'invitee@example.com',
        role: Role.MEMBER,
      });

      expect(prisma.workspaceInvitation.create).toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          inviterName: 'Owner User',
          workspaceName: 'PlanForge',
        }),
      );
      expect(result.id).toBe('inv-1');
    });
  });

  describe('validateToken', () => {
    it('should throw BadRequestException if token is missing', async () => {
      await expect(service.validateToken('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if invitation token does not exist', async () => {
      prisma.workspaceInvitation.findUnique.mockResolvedValue(null);

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
