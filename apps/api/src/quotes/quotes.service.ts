import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, OFFER_TYPES, SUPPORTED_CURRENCIES } from '@crm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { IsEnum, IsOptional, IsString, IsArray, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateQuoteDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() lineItems?: Record<string, unknown>[];
  /** Texte proposition / détail (manuel ou depuis modèle rendu). */
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() validUntil?: Date;
  @ApiPropertyOptional({ enum: ContractActivityType })
  @IsOptional()
  @IsEnum(ContractActivityType)
  prestationType?: ContractActivityType;
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
}

export class CreateQuoteTemplateDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ContractActivityType })
  @IsEnum(ContractActivityType)
  prestationType: ContractActivityType;
  @ApiProperty({
    description:
      'Variables : {{organization.name}}, {{contact.*}}, {{account.*}}, {{deal.title}}, {{deal.offerType}}, {{deal.offerTypeLabel}}, {{prestation.type}}, {{prestation.label}}, {{date.today}}',
  })
  @IsString()
  content: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CreateQuoteFromTemplateDto {
  @ApiProperty() @IsString() templateId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() lineItems?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() validUntil?: Date;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private orgSettings(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
  }

  private prestationLabel(p: ContractActivityType): string {
    const map: Record<ContractActivityType, string> = {
      plateforme_formation: 'Plateforme de formation',
      creation_application_site: 'Création application / site',
      conseil: 'Conseil',
      sensibilisation_formation_ia: 'Sensibilisation / formation IA',
      autre: 'Autre',
    };
    return map[p] ?? p;
  }

  /** Même famille de jetons que les modèles de contrat, + prestation du modèle et offre du deal. */
  private applyQuoteTemplatePlaceholders(
    templateContent: string,
    ctx: {
      organizationName: string;
      prestationType: ContractActivityType;
      contact?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        jobTitle?: string | null;
      } | null;
      account?: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
        address?: string | null;
        city?: string | null;
        country?: string | null;
      } | null;
      deal?: {
        title?: string | null;
        offerType?: string | null;
      } | null;
    },
  ) {
    const contactFullName = [ctx.contact?.firstName, ctx.contact?.lastName].filter(Boolean).join(' ');
    const offerType = ctx.deal?.offerType ?? '';
    const offerLabel =
      (OFFER_TYPES as readonly { id: string; label: string }[]).find((o) => o.id === offerType)?.label ??
      '';

    const replacements: Record<string, string> = {
      '{{organization.name}}': ctx.organizationName || '',
      '{{contact.firstName}}': ctx.contact?.firstName || '',
      '{{contact.lastName}}': ctx.contact?.lastName || '',
      '{{contact.fullName}}': contactFullName,
      '{{contact.email}}': ctx.contact?.email || '',
      '{{contact.phone}}': ctx.contact?.phone || '',
      '{{contact.jobTitle}}': ctx.contact?.jobTitle || '',
      '{{account.name}}': ctx.account?.name || '',
      '{{account.email}}': ctx.account?.email || '',
      '{{account.phone}}': ctx.account?.phone || '',
      '{{account.website}}': ctx.account?.website || '',
      '{{account.address}}': ctx.account?.address || '',
      '{{account.city}}': ctx.account?.city || '',
      '{{account.country}}': ctx.account?.country || '',
      '{{deal.title}}': ctx.deal?.title || '',
      '{{deal.offerType}}': offerType,
      '{{deal.offerTypeLabel}}': offerLabel,
      '{{prestation.type}}': ctx.prestationType,
      '{{prestation.label}}': this.prestationLabel(ctx.prestationType),
      '{{date.today}}': new Date().toLocaleDateString('fr-FR'),
    };
    return Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.split(key).join(value),
      templateContent,
    );
  }

  async listTemplates(user: AuthUser, prestationType?: ContractActivityType) {
    return this.prisma.quoteTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(prestationType && { prestationType }),
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createTemplate(dto: CreateQuoteTemplateDto, user: AuthUser) {
    return this.prisma.quoteTemplate.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }

  async updateTemplate(id: string, dto: Partial<CreateQuoteTemplateDto>, user: AuthUser) {
    const existing = await this.prisma.quoteTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Modèle de devis introuvable');
    return this.prisma.quoteTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async removeTemplate(id: string, user: AuthUser) {
    const existing = await this.prisma.quoteTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Modèle de devis introuvable');
    await this.prisma.quoteTemplate.delete({ where: { id } });
    return { message: 'Modèle de devis supprimé' };
  }

  async createFromTemplate(dto: CreateQuoteFromTemplateDto, user: AuthUser) {
    const template = await this.prisma.quoteTemplate.findFirst({
      where: { id: dto.templateId, organizationId: user.organizationId },
    });
    if (!template) throw new NotFoundException('Modèle de devis introuvable');

    let contact = dto.contactId
      ? await this.prisma.contact.findFirst({
          where: { id: dto.contactId, organizationId: user.organizationId },
        })
      : null;
    let account = dto.accountId
      ? await this.prisma.account.findFirst({
          where: { id: dto.accountId, organizationId: user.organizationId },
        })
      : null;
    const deal = dto.dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dto.dealId, organizationId: user.organizationId },
          select: {
            id: true,
            title: true,
            contactId: true,
            accountId: true,
            offerType: true,
          },
        })
      : null;

    if (dto.contactId && !contact) throw new NotFoundException('Contact introuvable');
    if (dto.accountId && !account) throw new NotFoundException('Entreprise introuvable');
    if (dto.dealId && !deal) throw new NotFoundException('Deal introuvable');

    if (deal) {
      if (!contact && deal.contactId) {
        contact = await this.prisma.contact.findFirst({
          where: { id: deal.contactId, organizationId: user.organizationId },
        });
      }
      if (!account && deal.accountId) {
        account = await this.prisma.account.findFirst({
          where: { id: deal.accountId, organizationId: user.organizationId },
        });
      }
    }
    if (contact?.accountId && !account) {
      account = await this.prisma.account.findFirst({
        where: { id: contact.accountId, organizationId: user.organizationId },
      });
    }

    const org = await this.orgSettings(user.organizationId);
    const renderedBody = this.applyQuoteTemplatePlaceholders(template.content, {
      organizationName: org?.name ?? '',
      prestationType: template.prestationType,
      contact,
      account,
      deal: deal ? { title: deal.title, offerType: deal.offerType } : null,
    });

    return this.create(
      {
        title: dto.title?.trim() || template.title,
        reference: dto.reference,
        dealId: dto.dealId,
        contactId: contact?.id,
        accountId: account?.id,
        currency: dto.currency ?? 'EUR',
        totalAmount: dto.totalAmount,
        taxAmount: dto.taxAmount,
        lineItems: dto.lineItems,
        validUntil: dto.validUntil,
        body: renderedBody,
        prestationType: template.prestationType,
        templateId: template.id,
      },
      user,
    );
  }

  async create(dto: CreateQuoteDto, user: AuthUser) {
    let contactId = dto.contactId;
    let accountId = dto.accountId;
    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId },
      });
      if (!deal) throw new NotFoundException('Deal introuvable');
      contactId = contactId ?? deal.contactId ?? undefined;
      accountId = accountId ?? deal.accountId ?? undefined;
    }

    try {
      return await this.prisma.quote.create({
        data: {
          title: dto.title,
          reference: dto.reference,
          dealId: dto.dealId,
          contactId,
          accountId,
          currency: dto.currency ?? 'EUR',
          totalAmount: dto.totalAmount,
          taxAmount: dto.taxAmount,
          lineItems: (dto.lineItems ?? []) as Prisma.InputJsonValue,
          notes: dto.notes,
          body: dto.body,
          validUntil: dto.validUntil,
          prestationType: dto.prestationType ?? 'autre',
          templateId: dto.templateId ?? undefined,
          organizationId: user.organizationId,
        },
        include: {
          deal: { select: { id: true, title: true } },
          contact: true,
          account: true,
          template: { select: { id: true, title: true, prestationType: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Référence de devis déjà utilisée pour cette organisation');
      }
      throw e;
    }
  }

  async findAll(pagination: PaginationDto, user: AuthUser, dealId?: string) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      organizationId: user.organizationId,
      ...(dealId && { dealId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deal: { select: { id: true, title: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          account: { select: { id: true, name: true } },
          template: { select: { id: true, title: true, prestationType: true } },
          _count: { select: { contracts: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        deal: true,
        contact: true,
        account: true,
        template: true,
        contracts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!quote) throw new NotFoundException('Devis introuvable');
    return quote;
  }

  async update(id: string, dto: Partial<CreateQuoteDto>, user: AuthUser) {
    const existing = await this.findOne(id, user);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Seul un devis en brouillon peut être modifié');
    }
    try {
      return await this.prisma.quote.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.reference !== undefined && { reference: dto.reference }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount }),
          ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),
          ...(dto.lineItems !== undefined && { lineItems: dto.lineItems as Prisma.InputJsonValue }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.body !== undefined && { body: dto.body }),
          ...(dto.validUntil !== undefined && { validUntil: dto.validUntil }),
          ...(dto.prestationType !== undefined && { prestationType: dto.prestationType }),
          ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        },
        include: {
          deal: { select: { id: true, title: true } },
          contact: true,
          account: true,
          template: { select: { id: true, title: true, prestationType: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Référence de devis déjà utilisée pour cette organisation');
      }
      throw e;
    }
  }

  private async notifyQuoteSent(quote: { id: string; title: string; contactId: string | null }, orgId: string) {
    if (!quote.contactId) return;
    const clientUser = await this.prisma.user.findFirst({
      where: { contactId: quote.contactId, organizationId: orgId },
    });
    if (!clientUser) return;
    await this.notifications.create({
      userId: clientUser.id,
      organizationId: orgId,
      type: 'deal_updated',
      title: 'Nouveau devis à consulter',
      body: `Le devis « ${quote.title} » est disponible dans votre espace (onglet commercial à venir) ou contactez votre interlocuteur.`,
      payload: { quoteId: quote.id, kind: 'quote_sent' },
    });
  }

  async send(id: string, user: AuthUser) {
    const q = await this.findOne(id, user);
    if (q.status !== 'draft') {
      throw new BadRequestException('Seuls les devis en brouillon peuvent être envoyés');
    }
    if (!q.contactId) {
      throw new BadRequestException('Associez un contact au devis avant envoi');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
      include: {
        deal: { select: { id: true, title: true } },
        contact: true,
        account: true,
        template: { select: { id: true, title: true, prestationType: true } },
      },
    });

    await this.notifyQuoteSent(updated, user.organizationId);
    return updated;
  }

  async accept(id: string, user: AuthUser) {
    const q = await this.findOne(id, user);
    if (q.status !== 'sent') {
      throw new BadRequestException('Seul un devis envoyé peut être accepté');
    }
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
      include: {
        deal: { select: { id: true, title: true } },
        contact: true,
        account: true,
        template: { select: { id: true, title: true, prestationType: true } },
      },
    });
  }

  async reject(id: string, user: AuthUser) {
    const q = await this.findOne(id, user);
    if (q.status !== 'sent') {
      throw new BadRequestException('Seul un devis envoyé peut être refusé');
    }
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'rejected', rejectedAt: new Date() },
      include: {
        deal: { select: { id: true, title: true } },
        contact: true,
        account: true,
        template: { select: { id: true, title: true, prestationType: true } },
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.quote.delete({ where: { id } });
    return { message: 'Devis supprimé' };
  }
}
