import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import {
  AuthUser,
  ProjectStatus,
  OFFER_TYPE_VALUES,
  DEFAULT_PROJECT_PHASE_TEMPLATES,
  PROJECT_PHASE_STATUS_VALUES,
  type OfferType,
  type ProjectPhaseStatus,
} from '@crm/shared';
import { IsOptional, IsString, IsArray, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['not_started','in_progress','on_hold','completed','cancelled'] })
  @IsOptional() @IsEnum(['not_started','in_progress','on_hold','completed','cancelled'])
  status?: ProjectStatus;
  @ApiPropertyOptional() @IsOptional() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() dueDate?: Date;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional({ enum: OFFER_TYPE_VALUES })
  @IsOptional()
  @IsIn([...OFFER_TYPE_VALUES])
  offerType?: OfferType;
}

export class UpdateProjectPhaseDto {
  @ApiProperty({ enum: PROJECT_PHASE_STATUS_VALUES as unknown as string[] })
  @IsIn([...PROJECT_PHASE_STATUS_VALUES])
  status: ProjectPhaseStatus;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, user: AuthUser) {
    let offerType = dto.offerType;
    if (offerType === undefined && dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId },
        select: { offerType: true },
      });
      if (deal) offerType = deal.offerType;
    }

    return this.prisma.project.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        ...(offerType !== undefined ? { offerType } : {}),
      },
      include: { deal: true, contact: true },
    });
  }

  async findAll(pagination: PaginationDto, user: AuthUser, status?: ProjectStatus) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(status && { status }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deal: { select: { id: true, title: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: true, documents: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        deal: true,
        contact: true,
        phases: { orderBy: { sortOrder: 'asc' } },
        tasks: {
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            subTasks: { orderBy: { order: 'asc' } },
          },
        },
        documents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async bootstrapPhases(id: string, user: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const existing = await this.prisma.projectPhase.count({ where: { projectId: id } });
    if (existing > 0) {
      return this.prisma.projectPhase.findMany({
        where: { projectId: id },
        orderBy: { sortOrder: 'asc' },
      });
    }
    await this.prisma.projectPhase.createMany({
      data: DEFAULT_PROJECT_PHASE_TEMPLATES.map((t) => ({
        projectId: id,
        key: t.key,
        label: t.label,
        sortOrder: t.sortOrder,
      })),
    });
    return this.prisma.projectPhase.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updatePhase(projectId: string, phaseId: string, dto: UpdateProjectPhaseDto, user: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const phase = await this.prisma.projectPhase.findFirst({
      where: { id: phaseId, projectId },
    });
    if (!phase) throw new NotFoundException('Phase introuvable');
    return this.prisma.projectPhase.update({
      where: { id: phaseId },
      data: {
        status: dto.status,
        completedAt: dto.status === 'completed' ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: Partial<CreateProjectDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'completed' ? { completedAt: new Date() } : {}),
      },
      include: { deal: true, contact: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projet supprimé' };
  }
}
