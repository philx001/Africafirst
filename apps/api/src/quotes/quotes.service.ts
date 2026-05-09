import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser } from '@crm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateQuoteDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() lineItems?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() validUntil?: Date;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
          validUntil: dto.validUntil,
          organizationId: user.organizationId,
        },
        include: { deal: { select: { id: true, title: true } }, contact: true, account: true },
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
          ...dto,
          lineItems: dto.lineItems !== undefined ? (dto.lineItems as Prisma.InputJsonValue) : undefined,
        },
        include: { deal: { select: { id: true, title: true } }, contact: true, account: true },
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
      include: { deal: { select: { id: true, title: true } }, contact: true, account: true },
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
      include: { deal: { select: { id: true, title: true } }, contact: true, account: true },
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
      include: { deal: { select: { id: true, title: true } }, contact: true, account: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.quote.delete({ where: { id } });
    return { message: 'Devis supprimé' };
  }
}
