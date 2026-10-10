import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
} from './dto/workspaces.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            key: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Workspace slug "${dto.slug}" already exists`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          logoUrl: dto.logoUrl,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: Role.OWNER,
        },
      });

      return workspace;
    });
  }

  async update(id: string, dto: UpdateWorkspaceDto, userId?: string) {
    await this.findOne(id);

    if (userId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });
      if (
        !member ||
        (member.role !== Role.OWNER && member.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only workspace owners and admins can update workspace details',
        );
      }
    }

    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async getMembers(workspaceId: string) {
    await this.findOne(workspaceId);

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(
    workspaceId: string,
    dto: AddWorkspaceMemberDto,
    userId?: string,
  ) {
    await this.findOne(workspaceId);

    if (userId) {
      const requester = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (
        !requester ||
        (requester.role !== Role.OWNER && requester.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only workspace owners and admins can add members',
        );
      }
      if (dto.role === Role.OWNER && requester.role !== Role.OWNER) {
        throw new ForbiddenException(
          'Only workspace owners can add members as OWNER',
        );
      }
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this workspace');
    }

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    dto: UpdateWorkspaceMemberDto,
    userId?: string,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in workspace');
    }

    if (userId) {
      if (userId === memberUserId) {
        throw new ForbiddenException('Cannot change your own role');
      }

      const requester = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      if (
        !requester ||
        (requester.role !== Role.OWNER && requester.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only workspace owners and admins can update member roles',
        );
      }

      if (member.role === Role.OWNER) {
        throw new ForbiddenException('Cannot demote workspace owner');
      }

      if (requester.role !== Role.OWNER) {
        if (member.role === Role.ADMIN) {
          throw new ForbiddenException(
            'Admins cannot change roles of other admins',
          );
        }
        if (dto.role === Role.OWNER) {
          throw new ForbiddenException(
            'Only workspace owners can assign the OWNER role',
          );
        }
      }
    }

    return this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(
    workspaceId: string,
    memberUserId: string,
    userId?: string,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in workspace');
    }

    if (member.role === Role.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    if (userId && userId !== memberUserId) {
      const requester = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      if (
        !requester ||
        (requester.role !== Role.OWNER && requester.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only workspace owners and admins can remove members',
        );
      }

      if (requester.role !== Role.OWNER && member.role === Role.ADMIN) {
        throw new ForbiddenException('Admins cannot remove other admins');
      }
    }

    return this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
    });

    if (!member || member.role !== Role.OWNER) {
      throw new ForbiddenException(
        'Only the workspace owner can delete the workspace',
      );
    }

    return this.prisma.workspace.delete({
      where: { id },
    });
  }
}
