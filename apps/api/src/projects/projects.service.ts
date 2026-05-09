import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, ProjectStatus } from '@crm/shared';
import { IsOptional, IsString, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';
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
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, user: AuthUser) {
    return this.prisma.project.create({
      data: { ...dto, organizationId: user.organizationId },
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
