import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser } from '@crm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AutomationsService } from '../automations/automations.service';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import * as crypto from 'crypto';

export class CreateContractDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quoteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() documentId?: string;
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly automations: AutomationsService,
  ) {}

  private orgSettings(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
  }

  async create(dto: CreateContractDto, user: AuthUser) {
    let contactId = dto.contactId;
    let accountId = dto.accountId;
    let dealId = dto.dealId;

    if (dto.quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: dto.quoteId, organizationId: user.organizationId },
      });
      if (!quote) throw new NotFoundException('Devis introuvable');
      contactId = contactId ?? quote.contactId ?? undefined;
      accountId = accountId ?? quote.accountId ?? undefined;
      dealId = dealId ?? quote.dealId ?? undefined;
    } else if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId },
      });
      if (!deal) throw new NotFoundException('Deal introuvable');
      contactId = contactId ?? deal.contactId ?? undefined;
      accountId = accountId ?? deal.accountId ?? undefined;
    }

    if (dto.documentId) {
      const doc = await this.prisma.document.findFirst({
        where: { id: dto.documentId, organizationId: user.organizationId },
      });
      if (!doc) throw new NotFoundException('Document introuvable');
      const existing = await this.prisma.contract.findFirst({ where: { documentId: dto.documentId } });
      if (existing) throw new BadRequestException('Ce document est déjà lié à un contrat');
    }

    return this.prisma.contract.create({
      data: {
        title: dto.title,
        body: dto.body,
        dealId,
        quoteId: dto.quoteId,
        contactId,
        accountId,
        currency: dto.currency ?? 'EUR',
        value: dto.value,
        documentId: dto.documentId,
        organizationId: user.organizationId,
      },
      include: {
        deal: { select: { id: true, title: true } },
        quote: { select: { id: true, title: true, reference: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        account: { select: { id: true, name: true } },
        document: { select: { id: true, filename: true } },
      },
    });
  }

  async fromQuote(quoteId: string, user: AuthUser) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, organizationId: user.organizationId },
    });
    if (!quote) throw new NotFoundException('Devis introuvable');
    if (quote.status !== 'accepted') {
      throw new BadRequestException('Le devis doit être au statut « accepté » pour générer un contrat');
    }

    const title = `Contrat — ${quote.title}`;
    const body =
      quote.notes ||
      `Contrat basé sur le devis${quote.reference ? ` ${quote.reference}` : ''}. Montant total : ${quote.totalAmount ?? '—'} ${quote.currency}.`;

    return this.create(
      {
        title,
        body,
        dealId: quote.dealId ?? undefined,
        quoteId: quote.id,
        contactId: quote.contactId ?? undefined,
        accountId: quote.accountId ?? undefined,
        currency: quote.currency,
        value: quote.totalAmount != null ? Number(quote.totalAmount) : undefined,
      },
      user,
    );
  }

  async findAll(pagination: PaginationDto, user: AuthUser, dealId?: string) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ContractWhereInput = {
      organizationId: user.organizationId,
      ...(dealId && { dealId }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deal: { select: { id: true, title: true } },
          quote: { select: { id: true, title: true, reference: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          document: { select: { id: true, filename: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        deal: true,
        quote: true,
        contact: true,
        account: true,
        document: true,
      },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    return contract;
  }

  async update(id: string, dto: Partial<CreateContractDto>, user: AuthUser) {
    const existing = await this.findOne(id, user);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Seul un contrat en brouillon peut être modifié');
    }

    if (dto.documentId) {
      const doc = await this.prisma.document.findFirst({
        where: { id: dto.documentId, organizationId: user.organizationId },
      });
      if (!doc) throw new NotFoundException('Document introuvable');
      const taken = await this.prisma.contract.findFirst({
        where: { documentId: dto.documentId, NOT: { id } },
      });
      if (taken) throw new BadRequestException('Ce document est déjà lié à un contrat');
    }

    return this.prisma.contract.update({
      where: { id },
      data: dto,
      include: {
        deal: { select: { id: true, title: true } },
        quote: { select: { id: true, title: true } },
        contact: true,
        document: true,
      },
    });
  }

  private generatePortalToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendForSignature(id: string, user: AuthUser) {
    const c = await this.findOne(id, user);
    if (c.status !== 'draft') {
      throw new BadRequestException('Seul un contrat en brouillon peut être envoyé pour signature');
    }
    if (!c.contactId) {
      throw new BadRequestException('Associez un contact signataire au contrat');
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + 14);

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: 'sent_for_signature',
        sentForSignatureAt: new Date(),
        portalToken: this.generatePortalToken(),
        portalTokenExpiresAt: expires,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: true,
        document: true,
      },
    });

    const clientUser = await this.prisma.user.findFirst({
      where: { contactId: c.contactId, organizationId: user.organizationId },
    });
    if (clientUser) {
      await this.notifications.create({
        userId: clientUser.id,
        organizationId: user.organizationId,
        type: 'contract_pending_signature',
        title: 'Contrat à signer',
        body: `Vous avez un document contractuel en attente de signature : « ${updated.title} ».`,
        payload: { contractId: updated.id },
      });
    }

    return updated;
  }

  /** Portail client : contrats visibles par le contact connecté */
  async findAllForContact(contactId: string, organizationId: string) {
    return this.prisma.contract.findMany({
      where: {
        organizationId,
        contactId,
        status: { in: ['sent_for_signature', 'signed'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        deal: { select: { id: true, title: true } },
        document: { select: { id: true, filename: true, mimeType: true } },
      },
    });
  }

  async findOneForContact(id: string, contactId: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        organizationId,
        contactId,
        status: { in: ['sent_for_signature', 'signed'] },
      },
      include: {
        deal: { select: { id: true, title: true } },
        quote: { select: { id: true, title: true, reference: true, totalAmount: true, currency: true } },
        document: true,
      },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    return contract;
  }

  async signByContact(
    id: string,
    contactId: string,
    organizationId: string,
    opts: { ip?: string; userAgent?: string },
  ) {
    const c = await this.prisma.contract.findFirst({
      where: { id, organizationId, contactId },
    });
    if (!c) throw new NotFoundException('Contrat introuvable');
    if (c.status !== 'sent_for_signature') {
      throw new BadRequestException('Ce contrat n\'est pas en attente de signature');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signedByContactId: contactId,
        signatoryIp: opts.ip,
        signatoryUserAgent: opts.userAgent,
        portalToken: null,
        portalTokenExpiresAt: null,
        signatureMetadata: {
          at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        quote: { select: { id: true } },
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: 'admin', isActive: true },
    });
    for (const a of admins) {
      await this.notifications.create({
        userId: a.id,
        organizationId,
        type: 'contract_signed',
        title: 'Contrat signé',
        body: `« ${updated.title} » a été signé par le client.`,
        payload: { contractId: updated.id, dealId: updated.dealId, quoteId: updated.quoteId },
      });
    }

    await this.automations.trigger(
      'contract.signed',
      {
        contract: {
          id: updated.id,
          title: updated.title,
          dealId: updated.dealId,
          quoteId: updated.quoteId,
          signedAt: updated.signedAt,
          signedByContactId: contactId,
        },
      },
      organizationId,
    );

    const org = await this.orgSettings(organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const webhookUrl = settings.contractSignedWebhookUrl as string | undefined;
    const webhookSecret = settings.contractSignedWebhookSecret as string | undefined;
    if (webhookUrl) {
      try {
        await this.webhooks.dispatch({
          url: webhookUrl,
          secret: webhookSecret,
          payload: {
            event: 'contract.signed',
            organizationId,
            contractId: updated.id,
            dealId: updated.dealId,
            quoteId: updated.quoteId,
            contactId,
            signedAt: updated.signedAt,
          },
        });
      } catch {
        /* log only in WebhooksService */
      }
    }

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.contract.delete({ where: { id } });
    return { message: 'Contrat supprimé' };
  }
}
