import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaginatedResult } from '../../common/dto/pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
} from './dto/notifications.dto.js';
import { NotificationsGateway } from './notifications.gateway.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: (dto.data as Prisma.InputJsonValue) ?? undefined,
      },
    });

    // Real-time broadcast to user socket room
    this.gateway.notifyUser(dto.userId, notification);

    return notification;
  }

  async findAll(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, unreadOnly, type } = query;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(type ? { type } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
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

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted' };
  }
}
