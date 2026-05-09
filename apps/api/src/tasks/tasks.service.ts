import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, TaskStatus } from '@crm/shared';
import { IsOptional, IsString, IsArray, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['todo','in_progress','in_review','done'] })
  @IsOptional() @IsEnum(['todo','in_progress','in_review','done'])
  status?: TaskStatus;
  @ApiPropertyOptional({ enum: ['low','medium','high','urgent'] })
  @IsOptional() @IsEnum(['low','medium','high','urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  @ApiPropertyOptional() @IsOptional() dueAt?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) estimatedHours?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentTaskId?: string;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, user: AuthUser) {
    const task = await this.prisma.task.create({
      data: { ...dto, organizationId: user.organizationId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        subTasks: true,
      },
    });

    // Notifier l'assigné si différent du créateur
    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.notifications.create({
        userId: task.assigneeId,
        organizationId: user.organizationId,
        type: 'task_assigned',
        title: 'Nouvelle tâche assignée',
        body: `La tâche "${task.title}" vous a été assignée`,
        payload: { taskId: task.id },
      });
    }

    return task;
  }

  async findAll(pagination: PaginationDto, user: AuthUser, filters?: {
    projectId?: string;
    assigneeId?: string;
    status?: TaskStatus;
  }) {
    const { page = 1, limit = 50, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      parentTaskId: null, // uniquement les tâches racines
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters?.status && { status: filters.status }),
      ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
          subTasks: {
            orderBy: { order: 'asc' },
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        parentTask: { select: { id: true, title: true } },
        subTasks: {
          orderBy: { order: 'asc' },
          include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Tâche introuvable');
    return task;
  }

  async update(id: string, dto: Partial<CreateTaskDto>, user: AuthUser) {
    const existing = await this.findOne(id, user);
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'done' && existing.status !== 'done' ? { completedAt: new Date() } : {}),
        ...(dto.status && dto.status !== 'done' ? { completedAt: null } : {}),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Mise à jour progression du projet
    if (updated.projectId) {
      await this.updateProjectProgress(updated.projectId, user.organizationId);
    }

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.task.delete({ where: { id } });
    return { message: 'Tâche supprimée' };
  }

  /** Recalcule la progression d'un projet en fonction des tâches complétées */
  private async updateProjectProgress(projectId: string, organizationId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, organizationId, parentTaskId: null },
      select: { status: true },
    });

    if (tasks.length === 0) return;

    const done = tasks.filter((t) => t.status === 'done').length;
    const progress = Math.round((done / tasks.length) * 100);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  }
}
