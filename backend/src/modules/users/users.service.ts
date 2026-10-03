import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { QueryUsersDto, UpdateUserDto } from './dto/users.dto.js';

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
}
