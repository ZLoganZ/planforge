import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AddProjectMemberDto,
  CreateProjectDto,
  QueryProjectsDto,
  UpdateProjectDto,
  UpdateProjectMemberDto,
} from './dto/projects.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: {
        workspaceId_key: {
          workspaceId: dto.workspaceId,
          key: dto.key,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Project key "${dto.key}" is already in use within this workspace`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: dto,
      });

      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: 'OWNER',
        },
      });

      return project;
    });
  }

  async findAll(query: QueryProjectsDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      workspaceId,
    } = query;

    const where: Prisma.ProjectWhereInput = {
      ...(workspaceId && { workspaceId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { key: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          _count: {
            select: { tasks: true, members: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
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
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({
      where: { id },
    });
    return { message: `Project "${id}" deleted` };
  }

  async listMembers(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    await this.findOne(projectId);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: dto.userIdOrEmail }, { email: dto.userIdOrEmail }],
      },
    });

    if (!user) {
      throw new NotFoundException(`User "${dto.userIdOrEmail}" not found`);
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(`User is already a member of this project`);
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberDto,
  ) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member not found in project`);
    }

    return this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member not found in project`);
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return { message: 'Member removed from project' };
  }
}
