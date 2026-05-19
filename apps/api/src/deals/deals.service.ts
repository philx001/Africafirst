import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AutomationsService } from '../automations/automations.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, DealStage, OFFER_TYPE_VALUES, SUPPORTED_CURRENCIES, type OfferType } from '@crm/shared';
import { ProjectTemplatesService } from '../project-templates/project-templates.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { IsOptional, IsString, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional({ enum: ['lead','qualified','proposal','negotiation','won','lost'] })
  @IsOptional() @IsEnum(['lead','qualified','proposal','negotiation','won','lost'])
  stage?: DealStage;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) value?: number;
  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  currency?: string;
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
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automations: AutomationsService,
    private readonly projectTemplates: ProjectTemplatesService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(dto: CreateDealDto, user: AuthUser) {
    const deal = await this.prisma.deal.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        ...(dto.stage === 'won' || dto.stage === 'lost' ? { closedAt: new Date() } : {}),
      },
      include: { contact: true, account: true },
    });

    await this.automations.trigger('deal.created', deal, user.organizationId);

    if (dto.stage === 'won') {
      await this.automations.trigger('deal.won', deal, user.organizationId);
      const onboardingId = await this.ensureOnboardingProjectForWonDeal({
        id: deal.id,
        organizationId: user.organizationId,
        title: deal.title,
        contactId: deal.contactId,
        offerType: deal.offerType as OfferType,
      });
      await this.dispatchDealWonWebhook(deal, null, onboardingId);
      if (onboardingId) return { ...deal, onboardingProjectCreatedId: onboardingId };
    } else if (dto.stage === 'lost') {
      await this.automations.trigger('deal.lost', deal, user.organizationId);
    }

    return deal;
  }

  /**
   * Scenario « deal gagné » : projet d’onboarding (tag tunnel_onboarding) + phases via modèle org ou défauts.
   * Idempotent avec le tunnel post-signature (`ContractsService.ensureTunnelOnboardingProject`).
   * Désactivable : organization.settings.disableAutoOnboardingProject === true
   */
  private async ensureOnboardingProjectForWonDeal(deal: {
    id: string;
    organizationId: string;
    title: string;
    contactId: string | null;
    offerType: OfferType;
  }): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: deal.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings.disableAutoOnboardingProject === true) return null;

    const existingTunnel = await this.prisma.project.findFirst({
      where: {
        organizationId: deal.organizationId,
        dealId: deal.id,
        tags: { has: 'tunnel_onboarding' },
      },
    });
    if (existingTunnel) return null;

    const project = await this.prisma.project.create({
      data: {
        organizationId: deal.organizationId,
        dealId: deal.id,
        contactId: deal.contactId,
        name: `Onboarding — ${deal.title}`,
        description:
          `Projet créé automatiquement lorsque le deal « ${deal.title} » passe en gagné.`,
        status: 'not_started',
        offerType: deal.offerType,
        tags: ['tunnel_onboarding'],
      },
    });

    await this.projectTemplates.instantiateForProjectByOrg(project.id, deal.organizationId);

    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: { deal: true, contact: true },
    });
    if (fullProject) {
      await this.automations.trigger('project.created', fullProject, deal.organizationId);
    }

    return project.id;
  }

  private async findTunnelOnboardingProjectId(organizationId: string, dealId: string): Promise<string | null> {
    const project = await this.prisma.project.findFirst({
      where: {
        organizationId,
        dealId,
        tags: { has: 'tunnel_onboarding' },
      },
      select: { id: true },
    });
    return project?.id ?? null;
  }

  private async dispatchDealWonWebhook(
    deal: {
      id: string;
      title: string;
      stage: DealStage;
      value: unknown;
      currency: string;
      offerType: OfferType;
      organizationId: string;
      contactId: string | null;
      accountId: string | null;
      closedAt: Date | null;
    },
    previousStage: DealStage | null,
    onboardingProjectCreatedId: string | null,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: deal.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    const webhookUrl = settings.dealWonWebhookUrl as string | undefined;
    const webhookSecret = settings.dealWonWebhookSecret as string | undefined;
    if (!webhookUrl) return;

    const onboardingProjectId =
      onboardingProjectCreatedId ?? (await this.findTunnelOnboardingProjectId(deal.organizationId, deal.id));

    try {
      await this.webhooks.dispatch({
        url: webhookUrl,
        secret: webhookSecret,
        payload: {
          event: 'deal.won',
          organizationId: deal.organizationId,
          occurredAt: new Date().toISOString(),
          deal: {
            id: deal.id,
            title: deal.title,
            stage: deal.stage,
            previousStage,
            value: deal.value,
            currency: deal.currency,
            offerType: deal.offerType,
            contactId: deal.contactId,
            accountId: deal.accountId,
            closedAt: deal.closedAt,
          },
          onboarding: {
            projectId: onboardingProjectId,
            createdNow: Boolean(onboardingProjectCreatedId),
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Webhook deal.won non envoyé pour le deal ${deal.id}: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    }
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
        const onboardingId = await this.ensureOnboardingProjectForWonDeal({
          id: updated.id,
          organizationId: user.organizationId,
          title: updated.title,
          contactId: updated.contactId,
          offerType: updated.offerType as OfferType,
        });
        await this.dispatchDealWonWebhook(
          {
            ...updated,
            organizationId: user.organizationId,
          },
          existing.stage,
          onboardingId,
        );
        if (onboardingId) {
          return { ...updated, onboardingProjectCreatedId: onboardingId };
        }
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
