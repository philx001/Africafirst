import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AutomationsService } from '../automations/automations.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, DealStage, OFFER_TYPE_VALUES, type OfferType } from '@crm/shared';
import { IsOptional, IsString, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional({ enum: ['lead','qualified','proposal','negotiation','won','lost'] })
  @IsOptional() @IsEnum(['lead','qualified','proposal','negotiation','won','lost'])
  stage?: DealStage;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) probability?: number;
  @ApiPropertyOptional() @IsOptional() expectedCloseAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional({ enum: OFFER_TYPE_VALUES })
  @IsOptional()
  @IsIn([...OFFER_TYPE_VALUES])
  offerType?: OfferType;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automations: AutomationsService,
  ) {}

  async create(dto: CreateDealDto, user: AuthUser) {
    const deal = await this.prisma.deal.create({
      data: { ...dto, organizationId: user.organizationId },
      include: { contact: true, account: true },
    });

    // Déclencher les automatisations
    await this.automations.trigger('deal.created', deal, user.organizationId);
    return deal;
  }

  async findAll(pagination: PaginationDto, user: AuthUser, stage?: DealStage) {
    const { page = 1, limit = 50, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(stage && { stage }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          account: { select: { id: true, name: true } },
          _count: { select: { interactions: true, projects: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        contact: true,
        account: true,
        interactions: { orderBy: { occurredAt: 'desc' }, take: 10 },
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
        projects: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!deal) throw new NotFoundException('Deal introuvable');
    return deal;
  }

  async update(id: string, dto: Partial<CreateDealDto>, user: AuthUser) {
    const existing = await this.findOne(id, user);
    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.stage === 'won' || dto.stage === 'lost' ? { closedAt: new Date() } : {}),
      },
      include: { contact: true, account: true },
    });

    // Déclencher l'automatisation si le stage a changé
    if (dto.stage && dto.stage !== existing.stage) {
      await this.automations.trigger('deal.stage_changed', { ...updated, previousStage: existing.stage }, user.organizationId);

      if (dto.stage === 'won') {
        await this.automations.trigger('deal.won', updated, user.organizationId);
      } else if (dto.stage === 'lost') {
        await this.automations.trigger('deal.lost', updated, user.organizationId);
      }
    } else {
      await this.automations.trigger('deal.updated', updated, user.organizationId);
    }

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.deal.delete({ where: { id } });
    return { message: 'Deal supprimé' };
  }

  /** Vue kanban : deals groupés par stage */
  async getKanban(user: AuthUser) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
      },
    });

    const stages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    return stages.reduce(
      (acc, stage) => {
        acc[stage] = deals.filter((d) => d.stage === stage);
        return acc;
      },
      {} as Record<DealStage, typeof deals>,
    );
  }
}
