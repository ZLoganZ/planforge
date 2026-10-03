import { randomBytes } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { EmailService } from '../email/email.service.js';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
} from './dto/invitations.dto.js';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    this.appUrl =
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('CORS_ORIGIN') ||
      'http://localhost:3001';
  }

  async create(userId: string, dto: CreateInvitationDto) {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? Role.MEMBER;

    // 1. Determine target workspace
    let workspaceId = dto.workspaceId;
    if (!workspaceId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      workspaceId = member?.workspaceId;
    }

    if (!workspaceId) {
      const defaultWs = await this.prisma.workspace.findFirst({
        select: { id: true },
      });
      workspaceId = defaultWs?.id;
    }

    if (!workspaceId) {
      throw new NotFoundException('Workspace not found');
    }

    // 2. Fetch workspace & inviter
    const [workspace, inviter] = await Promise.all([
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    if (!workspace) throw new NotFoundException('Workspace not found');
    if (!inviter) throw new NotFoundException('Inviter user not found');

    // 3. Check if user is already an active member of this workspace
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        `User ${email} is already a member of this workspace`
      );
    }

    // 4. Generate token & 7-day expiration
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 5. Upsert invitation (if a pending invite already exists, refresh token)
    const existingPending = await this.prisma.workspaceInvitation.findFirst({
      where: {
        email,
        workspaceId,
        status: 'PENDING',
      },
    });

    let invitation;
    if (existingPending) {
      invitation = await this.prisma.workspaceInvitation.update({
        where: { id: existingPending.id },
        data: {
          token,
          role,
          expiresAt,
          invitedById: inviter.id,
        },
      });
    } else {
      invitation = await this.prisma.workspaceInvitation.create({
        data: {
          email,
          role,
          token,
          expiresAt,
          invitedById: inviter.id,
          workspaceId,
        },
      });
    }

    // 6. Send invitation email
    const inviteUrl = `${this.appUrl}/invite/accept?token=${token}`;
    const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();

    await this.emailService.sendInvitationEmail({
      to: email,
      inviterName,
      workspaceName: workspace.name,
      role,
      inviteUrl,
    });

    return {
      ...invitation,
      inviteUrl,
      workspaceName: workspace.name,
    };
  }

  async findAll(userId: string, workspaceId?: string) {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      targetWorkspaceId = member?.workspaceId;
    }

    if (!targetWorkspaceId) return [];

    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId: targetWorkspaceId },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateToken(token: string) {
    if (!token) {
      throw new BadRequestException('Invitation token is required');
    }

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Invitation has already been ${invitation.status.toLowerCase()}`
      );
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invitation link has expired');
    }

    return {
      valid: true,
      email: invitation.email,
      role: invitation.role,
      workspace: invitation.workspace,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const { token, firstName, lastName, password } = dto;

    await this.validateToken(token);
    const invitation = await this.prisma.workspaceInvitation.findUniqueOrThrow({
      where: { token },
    });

    const email = invitation.email;

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const passwordHash = await hash(password, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: firstName.trim(),
          lastName: (lastName || '').trim(),
          passwordHash,
          isActive: true,
        },
      });
    }

    // Add to workspace
    await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Mark invitation accepted
    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    // Generate auth session
    return this.authService.generateAuthResponse(user);
  }

  async resend(id: string, userId: string) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id },
      include: {
        workspace: { select: { name: true } },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');

    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.workspaceInvitation.update({
      where: { id },
      data: {
        token,
        status: 'PENDING',
        expiresAt,
      },
    });

    const inviteUrl = `${this.appUrl}/invite/accept?token=${token}`;
    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`.trim()
      : 'A team admin';

    await this.emailService.sendInvitationEmail({
      to: invitation.email,
      inviterName,
      workspaceName: invitation.workspace.name,
      role: invitation.role,
      inviteUrl,
    });

    return {
      ...updated,
      inviteUrl,
    };
  }

  async revoke(id: string) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.prisma.workspaceInvitation.delete({
      where: { id },
    });

    return { message: 'Invitation revoked successfully' };
  }
}
