import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  InviteUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/users.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      isActive,
    } = query;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && {
        workspaceMembers: {
          some: { role },
        },
      }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          workspaceMembers: {
            select: {
              role: true,
              workspaceId: true,
            },
          },
          projectMembers: {
            select: {
              role: true,
              projectId: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedItems = items.map((u) => ({
      ...u,
      role:
        u.workspaceMembers[0]?.role ?? u.projectMembers[0]?.role ?? 'MEMBER',
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: formattedItems,
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        workspaceMembers: {
          select: {
            role: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true, slug: true } },
          },
        },
        projectMembers: {
          select: {
            role: true,
            projectId: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return {
      ...user,
      role:
        user.workspaceMembers[0]?.role ??
        user.projectMembers[0]?.role ??
        'MEMBER',
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(id); // Ensure exists
    const { role, ...userData } = dto;

    if (role && existing.workspaceMembers.length > 0) {
      // Update first workspace membership role
      await this.prisma.workspaceMember.updateMany({
        where: {
          userId: id,
          workspaceId: existing.workspaceMembers[0].workspaceId,
        },
        data: { role },
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true,
        workspaceMembers: {
          select: {
            role: true,
            workspaceId: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      role: updatedUser.workspaceMembers[0]?.role ?? role ?? 'MEMBER',
    };
  }

  async softDelete(id: string) {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: `User "${id}" deleted` };
  }

  async invite(dto: InviteUserDto, currentUserId?: string) {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? Role.MEMBER;

    // Find active workspace for the inviting user or default workspace
    let workspaceId: string | undefined;
    if (currentUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { userId: currentUserId },
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

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { workspaceMembers: true },
    });

    if (user) {
      // Reactivate user if deactivated or deleted
      if (!user.isActive || user.deletedAt) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: true, deletedAt: null },
        });
      }

      // Update name if provided
      if (dto.firstName || dto.lastName) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            ...(dto.firstName && { firstName: dto.firstName.trim() }),
            ...(dto.lastName && { lastName: dto.lastName.trim() }),
          },
        });
      }

      // Link to workspace if workspace exists
      if (workspaceId) {
        const existingMembership = await this.prisma.workspaceMember.findUnique(
          {
            where: {
              workspaceId_userId: {
                workspaceId,
                userId: user.id,
              },
            },
          },
        );

        if (existingMembership) {
          await this.prisma.workspaceMember.update({
            where: { id: existingMembership.id },
            data: { role },
          });
        } else {
          await this.prisma.workspaceMember.create({
            data: {
              workspaceId,
              userId: user.id,
              role,
            },
          });
        }
      }
    } else {
      const defaultPassword = 'Password123!';
      const passwordHash = await hash(defaultPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          firstName: dto.firstName?.trim() || email.split('@')[0],
          lastName: dto.lastName?.trim() || '',
          passwordHash,
          isActive: true,
          ...(workspaceId && {
            workspaceMembers: {
              create: {
                workspaceId,
                role,
              },
            },
          }),
        },
        include: { workspaceMembers: true },
      });
    }

    return this.findOne(user.id);
  }
}
