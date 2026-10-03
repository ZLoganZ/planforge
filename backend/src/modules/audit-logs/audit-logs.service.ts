import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import { CreateAuditLogDto, QueryAuditLogsDto } from './dto/audit-logs.dto.js';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        diff: (dto.diff as Prisma.InputJsonValue) ?? undefined,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        actorId: dto.actorId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  async findAll(query: QueryAuditLogsDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 25,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      action,
      entityType,
      entityId,
      actorId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.AuditLogWhereInput = {
      ...(action && { action }),
      ...(entityType && { entityType: { equals: entityType, mode: 'insensitive' } }),
      ...(entityId && { entityId }),
      ...(actorId && { actorId }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(search && {
        OR: [
          { entityType: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          {
            actor: {
              is: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }),
    };

    const [rawItems, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items = await enrichAuditLogs(this.prisma, rawItems);

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

  async getStats() {
    const [totalLogs, actionCounts, entityCounts] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
      }),
    ]);

    return {
      totalLogs,
      byAction: actionCounts.map((a) => ({ action: a.action, count: a._count.action })),
      byEntity: entityCounts.map((e) => ({ entity: e.entityType, count: e._count.entityType })),
    };
  }
}

export async function enrichAuditLogs(
  prisma: PrismaService,
  items: Array<{
    entityType: string;
    entityId: string;
    metadata?: unknown;
    diff?: unknown;
    [key: string]: unknown;
  }>,
) {
  if (!items || items.length === 0) return items;

  const taskIds = [
    ...new Set(
      items
        .filter((i) => i.entityType?.toLowerCase() === 'task' && i.entityId)
        .map((i) => i.entityId),
    ),
  ];

  const projectIds = [
    ...new Set(
      items
        .filter((i) => i.entityType?.toLowerCase() === 'project' && i.entityId)
        .map((i) => i.entityId),
    ),
  ];

  const sprintIds = [
    ...new Set(
      items
        .filter((i) => i.entityType?.toLowerCase() === 'sprint' && i.entityId)
        .map((i) => i.entityId),
    ),
  ];

  const [tasks, projects, sprints] = await Promise.all([
    taskIds.length > 0
      ? prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: {
            id: true,
            title: true,
            taskNumber: true,
            project: { select: { id: true, key: true, name: true } },
          },
        })
      : [],
    projectIds.length > 0
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true, key: true },
        })
      : [],
    sprintIds.length > 0
      ? prisma.sprint.findMany({
          where: { id: { in: sprintIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const sprintMap = new Map(sprints.map((s) => [s.id, s]));

  return items.map((item) => {
    let entityDetails: {
      name?: string;
      title?: string;
      key?: string;
      projectName?: string;
    } | null = null;

    const meta = (item.metadata as Record<string, unknown>) || {};
    const diff = (item.diff as Record<string, unknown>) || {};

    if (item.entityType?.toLowerCase() === 'task') {
      const task = taskMap.get(item.entityId);
      if (task) {
        const taskKey = `${task.project?.key || 'TASK'}-${task.taskNumber}`;
        entityDetails = {
          title: task.title,
          key: taskKey,
          projectName: task.project?.name,
          name: `${taskKey}: ${task.title}`,
        };
      } else {
        const title =
          (meta.taskTitle as string | undefined) ||
          (meta.title as string | undefined) ||
          (diff.title && typeof diff.title === 'object'
            ? ((diff.title as Record<string, unknown>)?.to as string | undefined) ||
              ((diff.title as Record<string, unknown>)?.from as string | undefined)
            : (diff.title as string | undefined));
        const key = (meta.taskKey as string | undefined) || undefined;
        entityDetails = {
          title: typeof title === 'string' ? title : undefined,
          key,
          projectName: (meta.projectName as string | undefined) || undefined,
          name: key && title ? `${key}: ${title}` : (key || title || 'Task'),
        };
      }
    } else if (item.entityType?.toLowerCase() === 'project') {
      const proj = projectMap.get(item.entityId);
      if (proj) {
        entityDetails = {
          title: proj.name,
          key: proj.key,
          name: `${proj.key} - ${proj.name}`,
        };
      }
    } else if (item.entityType?.toLowerCase() === 'sprint') {
      const sprint = sprintMap.get(item.entityId);
      if (sprint) {
        entityDetails = {
          title: sprint.name,
          name: sprint.name,
        };
      }
    }

    return {
      ...item,
      entityDetails,
    };
  });
}
