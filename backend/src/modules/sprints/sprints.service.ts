import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SprintStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import {
  CreateSprintDto,
  QuerySprintsDto,
  UpdateSprintDto,
} from './dto/sprints.dto.js';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSprintDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID "${dto.projectId}" not found`,
      );
    }

    return this.prisma.sprint.create({
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        projectId: dto.projectId,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async findAll(query: QuerySprintsDto) {
    const { projectId, status } = query;

    const where: Prisma.SprintWhereInput = {
      ...(projectId && { projectId }),
      ...(status && { status }),
    };

    const sprints = await this.prisma.sprint.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            storyPoints: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Augment with computed metrics
    return sprints.map((sprint) => {
      const totalPoints = sprint.tasks.reduce(
        (acc, t) => acc + (t.storyPoints || 0),
        0,
      );
      const completedPoints = sprint.tasks
        .filter((t) => t.status === 'DONE')
        .reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      const completedTasks = sprint.tasks.filter(
        (t) => t.status === 'DONE',
      ).length;

      return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        createdAt: sprint.createdAt,
        updatedAt: sprint.updatedAt,
        projectId: sprint.projectId,
        project: sprint.project,
        totalTasks: sprint.tasks.length,
        completedTasks,
        totalPoints,
        completedPoints,
      };
    });
  }

  async findOne(id: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            taskLabels: {
              include: { label: true },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID "${id}" not found`);
    }

    const totalPoints = sprint.tasks.reduce(
      (acc, t) => acc + (t.storyPoints || 0),
      0,
    );
    const completedPoints = sprint.tasks
      .filter((t) => t.status === 'DONE')
      .reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const completedTasks = sprint.tasks.filter(
      (t) => t.status === 'DONE',
    ).length;

    return {
      ...sprint,
      totalTasks: sprint.tasks.length,
      completedTasks,
      totalPoints,
      completedPoints,
    };
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOne(id);

    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
      },
    });
  }

  async start(id: string) {
    const sprint = await this.findOne(id);

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.ACTIVE,
        startDate: sprint.startDate || new Date(),
      },
    });
  }

  async complete(id: string) {
    await this.findOne(id);

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.COMPLETED,
        endDate: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Unlink tasks from deleted sprint
      await tx.task.updateMany({
        where: { sprintId: id },
        data: { sprintId: null },
      });

      await tx.sprint.delete({
        where: { id },
      });

      return {
        message: `Sprint "${id}" deleted and associated tasks returned to backlog`,
      };
    });
  }
}
