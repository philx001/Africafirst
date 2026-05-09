import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { NotificationType } from '@crm/shared';

export interface CreateNotificationDto {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(userId: string, organizationId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        organizationId,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, organizationId, readAt: null },
    });
  }

  async markAsRead(id: string, userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, organizationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
