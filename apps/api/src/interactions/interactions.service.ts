import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, InteractionType } from '@crm/shared';
import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInteractionDto {
  @ApiProperty({ enum: ['email','call','meeting','note'] })
  @IsEnum(['email','call','meeting','note'])
  type: InteractionType;

  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() occurredAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsInt() duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInteractionDto, user: AuthUser) {
    return this.prisma.interaction.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        userId: user.id,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(pagination: PaginationDto, user: AuthUser, filters?: {
    contactId?: string;
    dealId?: string;
    projectId?: string;
    type?: InteractionType;
  }) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(filters?.contactId && { contactId: filters.contactId }),
      ...(filters?.dealId && { dealId: filters.dealId }),
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.type && { type: filters.type }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.interaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.interaction.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async remove(id: string, user: AuthUser) {
    const interaction = await this.prisma.interaction.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!interaction) throw new NotFoundException('Interaction introuvable');
    await this.prisma.interaction.delete({ where: { id } });
    return { message: 'Interaction supprimée' };
  }
}
