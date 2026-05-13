import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, ProjectPhaseStatus } from '@prisma/client';
import {
  AuthUser,
  DEFAULT_PROJECT_PHASE_TEMPLATES,
  OFFER_TYPE_VALUES,
  PROJECT_PHASE_STATUS_VALUES,
  type OfferType,
} from '@crm/shared';
import { PrismaService } from '../config/prisma.service';

export class CreateProjectTemplateDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: OFFER_TYPE_VALUES }) @IsOptional() @IsIn([...OFFER_TYPE_VALUES]) offerType?: OfferType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class CreateProjectTemplatePhaseDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() label: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional({ enum: PROJECT_PHASE_STATUS_VALUES })
  @IsOptional()
  @IsIn([...PROJECT_PHASE_STATUS_VALUES])
  defaultStatus?: ProjectPhaseStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) targetDelayDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() gate?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() deliverables?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ApplyProjectTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
}

type TemplateWithPhases = Prisma.ProjectTemplateGetPayload<{
  include: { phases: { orderBy: { sortOrder: 'asc' } } };
}>;

@Injectable()
export class ProjectTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, filters?: { offerType?: OfferType; active?: boolean }) {
    return this.prisma.projectTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(filters?.offerType && { offerType: filters.offerType }),
        ...(filters?.active !== undefined && { isActive: filters.active }),
      },
      orderBy: [{ offerType: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
      include: { phases: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { phases: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Modèle de projet introuvable');
    return template;
  }

  async create(dto: CreateProjectTemplateDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const offerType = dto.offerType ?? 'generic';
      if (dto.isDefault) {
        await tx.projectTemplate.updateMany({
          where: { organizationId: user.organizationId, offerType },
          data: { isDefault: false },
        });
      }
      return tx.projectTemplate.create({
        data: {
          key: dto.key.trim(),
          name: dto.name.trim(),
          description: dto.description,
          offerType,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          organizationId: user.organizationId,
        },
        include: { phases: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async update(id: string, dto: Partial<CreateProjectTemplateDto>, user: AuthUser) {
    const existing = await this.findOne(id, user);
    const offerType = dto.offerType ?? existing.offerType;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.projectTemplate.updateMany({
          where: { organizationId: user.organizationId, offerType, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.projectTemplate.update({
        where: { id },
        data: {
          ...(dto.key !== undefined && { key: dto.key.trim() }),
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.offerType !== undefined && { offerType: dto.offerType }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
        },
        include: { phases: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async deactivate(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.projectTemplate.update({
      where: { id },
      data: { isActive: false, isDefault: false },
      include: { phases: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async addPhase(templateId: string, dto: CreateProjectTemplatePhaseDto, user: AuthUser) {
    await this.findOne(templateId, user);
    return this.prisma.projectTemplatePhase.create({
      data: {
        key: dto.key.trim(),
        label: dto.label.trim(),
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isRequired: dto.isRequired ?? false,
        defaultStatus: dto.defaultStatus ?? 'pending',
        targetDelayDays: dto.targetDelayDays,
        gate: (dto.gate ?? {}) as Prisma.InputJsonValue,
        deliverables: (dto.deliverables ?? []) as Prisma.InputJsonValue,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        templateId,
      },
    });
  }

  async updatePhase(templateId: string, phaseId: string, dto: Partial<CreateProjectTemplatePhaseDto>, user: AuthUser) {
    await this.findOne(templateId, user);
    const existing = await this.prisma.projectTemplatePhase.findFirst({ where: { id: phaseId, templateId } });
    if (!existing) throw new NotFoundException('Phase de modèle introuvable');
    return this.prisma.projectTemplatePhase.update({
      where: { id: phaseId },
      data: {
        ...(dto.key !== undefined && { key: dto.key.trim() }),
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.defaultStatus !== undefined && { defaultStatus: dto.defaultStatus }),
        ...(dto.targetDelayDays !== undefined && { targetDelayDays: dto.targetDelayDays }),
        ...(dto.gate !== undefined && { gate: dto.gate as Prisma.InputJsonValue }),
        ...(dto.deliverables !== undefined && { deliverables: dto.deliverables as Prisma.InputJsonValue }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  async removePhase(templateId: string, phaseId: string, user: AuthUser) {
    await this.findOne(templateId, user);
    const existing = await this.prisma.projectTemplatePhase.findFirst({ where: { id: phaseId, templateId } });
    if (!existing) throw new NotFoundException('Phase de modèle introuvable');
    await this.prisma.projectTemplatePhase.delete({ where: { id: phaseId } });
    return { message: 'Phase de modèle supprimée' };
  }

  async instantiateForProject(projectId: string, user: AuthUser, options: ApplyProjectTemplateDto = {}) {
    return this.instantiateForProjectByOrg(projectId, user.organizationId, options);
  }

  async instantiateForProjectByOrg(
    projectId: string,
    organizationId: string,
    options: ApplyProjectTemplateDto = {},
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, offerType: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const existing = await this.prisma.projectPhase.count({ where: { projectId } });
    if (existing > 0) {
      return this.prisma.projectPhase.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });
    }

    const template = await this.selectTemplate(organizationId, project.offerType, options.templateId);
    if (!template) {
      await this.prisma.projectPhase.createMany({
        data: DEFAULT_PROJECT_PHASE_TEMPLATES.map((phase) => ({
          projectId,
          key: phase.key,
          label: phase.label,
          sortOrder: phase.sortOrder,
        })),
        skipDuplicates: true,
      });
      return this.prisma.projectPhase.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });
    }

    if (template.phases.length === 0) {
      throw new BadRequestException('Le modèle sélectionné ne contient aucune phase');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.project.update({ where: { id: projectId }, data: { templateId: template.id } }),
      this.prisma.projectPhase.createMany({
        data: template.phases.map((phase) => ({
          projectId,
          key: phase.key,
          label: phase.label,
          description: phase.description,
          sortOrder: phase.sortOrder,
          status: phase.defaultStatus,
          completedAt: phase.defaultStatus === 'completed' ? now : null,
          resolvedAt: this.isTerminalPhaseStatus(phase.defaultStatus) ? now : null,
          templatePhaseId: phase.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.projectPhase.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });
  }

  private async selectTemplate(
    organizationId: string,
    offerType: OfferType,
    explicitTemplateId?: string,
  ): Promise<TemplateWithPhases | null> {
    if (explicitTemplateId) {
      const template = await this.prisma.projectTemplate.findFirst({
        where: { id: explicitTemplateId, organizationId, isActive: true },
        include: { phases: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!template) throw new NotFoundException('Modèle de projet introuvable');
      return template;
    }

    return (
      (await this.prisma.projectTemplate.findFirst({
        where: { organizationId, offerType, isActive: true, isDefault: true },
        include: { phases: { orderBy: { sortOrder: 'asc' } } },
      })) ??
      (await this.prisma.projectTemplate.findFirst({
        where: { organizationId, offerType: 'generic', isActive: true, isDefault: true },
        include: { phases: { orderBy: { sortOrder: 'asc' } } },
      }))
    );
  }

  private isTerminalPhaseStatus(status: ProjectPhaseStatus) {
    return status === 'completed' || status === 'skipped' || status === 'not_applicable';
  }
}
