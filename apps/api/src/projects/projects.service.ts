import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import {
  AuthUser,
  ProjectStatus,
  OFFER_TYPE_VALUES,
  PROJECT_PHASE_STATUS_VALUES,
  type OfferType,
  type ProjectPhaseStatus,
} from '@crm/shared';
import { IsOptional, IsString, IsArray, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApplyProjectTemplateDto, ProjectTemplatesService } from '../project-templates/project-templates.service';

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
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() generatePhases?: boolean;
}

export class UpdateProjectPhaseDto {
  @ApiProperty({ enum: PROJECT_PHASE_STATUS_VALUES as unknown as string[] })
  @IsIn([...PROJECT_PHASE_STATUS_VALUES])
  status: ProjectPhaseStatus;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectTemplates: ProjectTemplatesService,
  ) {}

  async create(dto: CreateProjectDto, user: AuthUser) {
    let offerType = dto.offerType;
    if (offerType === undefined && dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId },
        select: { offerType: true },
      });
      if (deal) offerType = deal.offerType;
    }

    const { templateId, generatePhases, ...projectDto } = dto;
    const project = await this.prisma.project.create({
      data: {
        ...projectDto,
        organizationId: user.organizationId,
        ...(offerType !== undefined ? { offerType } : {}),
      },
      include: { deal: true, contact: true },
    });
    if (generatePhases) {
      await this.projectTemplates.instantiateForProject(project.id, user, { templateId });
      return this.findOne(project.id, user);
    }
    return project;
  }

  async findAll(pagination: PaginationDto, user: AuthUser, status?: ProjectStatus, dealId?: string) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(status && { status }),
      ...(dealId && { dealId }),
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
    return this.projectTemplates.instantiateForProject(id, user);
  }

  async applyTemplate(id: string, dto: ApplyProjectTemplateDto, user: AuthUser) {
    return this.projectTemplates.instantiateForProject(id, user, dto);
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
        resolvedAt: ['completed', 'skipped', 'not_applicable'].includes(dto.status) ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: Partial<CreateProjectDto>, user: AuthUser) {
    await this.findOne(id, user);
    const { templateId: _templateId, generatePhases: _generatePhases, ...projectDto } = dto;
    return this.prisma.project.update({
      where: { id },
      data: {
        ...projectDto,
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
