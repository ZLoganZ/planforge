import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, NotificationType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateCommentDto } from './dto/comments.dto.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(taskId: string, authorId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        taskId,
        authorId,
      },
      include: {
        author: {
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

    // Notify task assignee if someone else commented
    if (task.assigneeId && task.assigneeId !== authorId) {
      await this.notifications.create({
        userId: task.assigneeId,
        type: NotificationType.TASK_COMMENTED,
        title: `New comment on ${task.project.key}-${task.taskNumber}`,
        message: `${comment.author.firstName} commented: "${dto.content.slice(0, 80)}${dto.content.length > 80 ? '...' : ''}"`,
        data: { taskId: task.id, commentId: comment.id },
      });
    }

    // Auto audit log
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.COMMENT,
        entityType: 'Task',
        entityId: taskId,
        actorId: authorId,
        diff: { content: dto.content.slice(0, 100) },
      },
    });

    return comment;
  }

  async findByTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
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

  async delete(commentId: string, userId: string, userRole?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (
      comment.authorId !== userId &&
      userRole !== 'ADMIN' &&
      userRole !== 'OWNER'
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
