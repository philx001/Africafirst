import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ContractActivityType, ContractStatus, Prisma, SignatureProvider } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser } from '@crm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AutomationsService } from '../automations/automations.service';
import { ProjectTemplatesService } from '../project-templates/project-templates.service';
import { IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
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
  @ApiPropertyOptional({ enum: ContractActivityType })
  @IsOptional()
  @IsEnum(ContractActivityType)
  activityType?: ContractActivityType;
  @ApiPropertyOptional() @IsOptional() @IsString() folderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
}

export class CreateContractFolderDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

export class CreateContractTemplateDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ContractActivityType })
  @IsEnum(ContractActivityType)
  activityType: ContractActivityType;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() isDefault?: boolean;
}

export class CreateContractFromTemplateDto {
  @ApiProperty() @IsString() templateId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() value?: number;
}

export class SendForSignatureDto {
  @ApiPropertyOptional({ enum: SignatureProvider })
  @IsOptional()
  @IsEnum(SignatureProvider)
  provider?: SignatureProvider;
  @ApiPropertyOptional() @IsOptional() @IsString() externalWebhookUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalWebhookSecret?: string;
}

export class MoveContractFolderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() folderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
}

export class SignatureReminderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional({ enum: ['manual', 'auto_j3', 'auto_j7'] })
  @IsOptional()
  @IsIn(['manual', 'auto_j3', 'auto_j7'])
  stage?: 'manual' | 'auto_j3' | 'auto_j7';
}

export class ExternalSignatureCallbackDto {
  @ApiPropertyOptional() @IsOptional() @IsString() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerEnvelopeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eventType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() failureReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerEventId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() evidenceUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() evidenceHash?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() callbackSecret?: string;
}

export class EnvelopeReminderDto {
  @ApiProperty() @IsString() providerEnvelopeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ProviderStatusUpdateDto {
  @ApiProperty({ enum: ['requested', 'viewed', 'declined', 'failed'] })
  @IsIn(['requested', 'viewed', 'declined', 'failed'])
  status: 'requested' | 'viewed' | 'declined' | 'failed';
  @ApiPropertyOptional() @IsOptional() @IsString() providerEnvelopeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ContractEventsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional({ enum: ['all', 'contracts', 'documents', 'messages', 'notifications'] })
  @IsOptional()
  @IsIn(['all', 'contracts', 'documents', 'messages', 'notifications'])
  scope?: 'all' | 'contracts' | 'documents' | 'messages' | 'notifications';
}

export class ProductionWebhookTestDto {
  @ApiPropertyOptional({ enum: ['communication', 'signature_request', 'signature_signed', 'signature_reminder'] })
  @IsOptional()
  @IsIn(['communication', 'signature_request', 'signature_signed', 'signature_reminder'])
  channel?: 'communication' | 'signature_request' | 'signature_signed' | 'signature_reminder';
  @ApiPropertyOptional() @IsOptional() @IsString() customUrl?: string;
}

/** Étapes manuelles E2E persistées dans organization.settings.contractsProductionRunbook.steps */
export const CONTRACT_PRODUCTION_RUNBOOK_DEFINITIONS: ReadonlyArray<{ id: string; label: string }> = [
  {
    id: 'webhook_smoke_ok',
    label: "Test webhook depuis l'UI « Mise en production » réussi (au moins un canal).",
  },
  {
    id: 'callback_aligned_ok',
    label: 'URL et secret callback prestataire alignés avec le bon environnement (staging / prod).',
  },
  {
    id: 'client_signature_flow_ok',
    label: 'Parcours signature portail client validé sur un cas pilote.',
  },
  {
    id: 'auto_reminders_observed_ok',
    label: 'Relances automatiques J+3/J+7 observées ou déclenchées manuellement sur un cas test.',
  },
  {
    id: 'audit_export_verified_ok',
    label: 'Export audit JSON/PDF contrôlé sur au moins un contrat réel ou pilote.',
  },
  {
    id: 'business_go_live_ok',
    label: 'Validation GO production par le responsable métier ou juridique.',
  },
];

export class ContractRunbookPatchDto {
  @ApiProperty({
    description: 'Identifiants définis par CONTRACT_PRODUCTION_RUNBOOK_DEFINITIONS → booléen coché',
    example: { webhook_smoke_ok: true },
  })
  @IsObject()
  steps: Record<string, unknown>;
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly automations: AutomationsService,
    private readonly projectTemplates: ProjectTemplatesService,
  ) {}

  private slugify(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private orgSettings(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });
  }

  private asMetadataRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private reminderAlreadySent(signatureMetadata: Prisma.JsonValue | null | undefined, stage: string): boolean {
    const meta = this.asMetadataRecord(signatureMetadata);
    const history = Array.isArray(meta.reminderHistory) ? meta.reminderHistory : [];
    return history.some(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>).stage === stage,
    );
  }

  private providerStatusLabel(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === 'requested') return 'Demande envoyee';
    if (normalized === 'viewed') return 'Contrat ouvert par le signataire';
    if (normalized === 'declined') return 'Signature refusee';
    if (normalized === 'signed') return 'Signature completee';
    if (normalized === 'failed') return 'Echec prestataire';
    return normalized;
  }

  private providerActionRecommendation(status: string, reason?: string) {
    if (status === 'failed') {
      if (reason && reason.toLowerCase().includes('identity')) {
        return 'Verifier les informations d identite du signataire puis renvoyer la demande.';
      }
      if (reason && reason.toLowerCase().includes('expired')) {
        return 'Relancer une nouvelle demande de signature avec une date de validite a jour.';
      }
      return 'Verifier les logs provider puis relancer manuellement la signature.';
    }
    if (status === 'declined') {
      return 'Contacter le client pour correction contractuelle puis renvoyer.';
    }
    return 'Aucune action immediate requise.';
  }

  private async resolveExternalCallbackTarget(dto: ExternalSignatureCallbackDto) {
    if (dto.contractId) {
      const byId = await this.prisma.contract.findUnique({
        where: { id: dto.contractId },
        select: { id: true, organizationId: true, contactId: true, status: true, signatureMetadata: true },
      });
      if (byId) return byId;
    }

    if (!dto.providerEnvelopeId) {
      return null;
    }

    const candidates = await this.prisma.contract.findMany({
      where: { status: 'sent_for_signature' },
      select: { id: true, organizationId: true, contactId: true, status: true, signatureMetadata: true },
      take: 500,
    });

    return (
      candidates.find((contract) => {
        const metadata = this.asMetadataRecord(contract.signatureMetadata);
        return metadata.providerEnvelopeId === dto.providerEnvelopeId;
      }) ?? null
    );
  }

  private async findContractByEnvelopeId(organizationId: string, providerEnvelopeId: string) {
    const candidates = await this.prisma.contract.findMany({
      where: { organizationId, status: 'sent_for_signature' },
      select: {
        id: true,
        title: true,
        contactId: true,
        organizationId: true,
        status: true,
        signatureMetadata: true,
      },
      take: 500,
    });

    return (
      candidates.find((contract) => {
        const metadata = this.asMetadataRecord(contract.signatureMetadata);
        return metadata.providerEnvelopeId === providerEnvelopeId;
      }) ?? null
    );
  }

  private async applyProviderLifecycleEvent(
    contract: {
      id: string;
      organizationId: string;
      contactId: string | null;
      signatureMetadata: Prisma.JsonValue;
    },
    dto: ExternalSignatureCallbackDto,
  ) {
    const rawEvent = dto.eventType || dto.providerStatus || '';
    const normalizedEvent = rawEvent.toLowerCase();
    let nextProviderStatus: 'requested' | 'viewed' | 'declined' | 'signed' | 'failed' | null = null;

    if (['requested', 'sent'].includes(normalizedEvent)) nextProviderStatus = 'requested';
    else if (['viewed', 'opened', 'read'].includes(normalizedEvent)) nextProviderStatus = 'viewed';
    else if (['declined', 'rejected', 'cancelled'].includes(normalizedEvent)) nextProviderStatus = 'declined';
    else if (['signed', 'completed', 'done'].includes(normalizedEvent)) nextProviderStatus = 'signed';
    else if (['failed', 'error'].includes(normalizedEvent)) nextProviderStatus = 'failed';
    else return null;

    const failureReason = dto.failureReason || dto.eventType || dto.providerStatus;
    const recommendedAction = this.providerActionRecommendation(nextProviderStatus, failureReason);

    const previousMetadata = this.asMetadataRecord(contract.signatureMetadata);
    const previousHistory = Array.isArray(previousMetadata.providerEventHistory)
      ? [...previousMetadata.providerEventHistory]
      : [];
    previousHistory.push({
      eventType: dto.eventType ?? dto.providerStatus ?? 'unknown',
      providerStatus: nextProviderStatus,
      providerEventId: dto.providerEventId ?? null,
      providerEnvelopeId: dto.providerEnvelopeId ?? previousMetadata.providerEnvelopeId ?? null,
      failureReason: nextProviderStatus === 'failed' ? failureReason : null,
      recommendedAction,
      at: new Date().toISOString(),
    });

    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        signatureMetadata: {
          ...previousMetadata,
          providerStatus: nextProviderStatus,
          providerEnvelopeId: dto.providerEnvelopeId ?? previousMetadata.providerEnvelopeId ?? null,
          providerEventId: dto.providerEventId ?? previousMetadata.providerEventId ?? null,
          providerEventHistory: previousHistory,
          providerFailureReason: nextProviderStatus === 'failed' ? failureReason : previousMetadata.providerFailureReason,
          providerRecommendedAction: recommendedAction,
        } as Prisma.InputJsonValue,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { organizationId: contract.organizationId, role: 'admin', isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notifications.create({
        userId: admin.id,
        organizationId: contract.organizationId,
        type: 'contract_pending_signature',
        title: 'Mise a jour signature externe',
        body: `Statut prestataire: ${this.providerStatusLabel(nextProviderStatus)}. ${recommendedAction}`,
        payload: {
          contractId: contract.id,
          providerStatus: nextProviderStatus,
          providerEventId: dto.providerEventId,
          providerEnvelopeId: dto.providerEnvelopeId,
          recommendedAction,
        },
      });
    }

    await this.automations.trigger(
      'contract.signature.provider_status_changed',
      {
        contract: {
          id: contract.id,
          providerStatus: nextProviderStatus,
          providerEventId: dto.providerEventId ?? null,
          providerEnvelopeId: dto.providerEnvelopeId ?? null,
          recommendedAction,
        },
      },
      contract.organizationId,
    );
    await this.automations.trigger(
      `contract.signature.${nextProviderStatus}`,
      {
        contract: {
          id: contract.id,
          providerStatus: nextProviderStatus,
          providerEventId: dto.providerEventId ?? null,
          providerEnvelopeId: dto.providerEnvelopeId ?? null,
          recommendedAction,
        },
      },
      contract.organizationId,
    );

    return { contractId: contract.id, providerStatus: nextProviderStatus };
  }

  private buildExternalProviderPayload(
    providerName: string | undefined,
    contract: {
      id: string;
      title: string;
      body: string | null;
      contactId: string | null;
      contact?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
    },
    organizationId: string,
  ) {
    const signerName = [contract.contact?.firstName, contract.contact?.lastName].filter(Boolean).join(' ').trim();
    const signerEmail = contract.contact?.email ?? '';
    const sharedMetadata = {
      organizationId,
      contractId: contract.id,
      contactId: contract.contactId,
    };
    const normalized = (providerName ?? 'generic').toLowerCase();

    if (normalized === 'yousign') {
      return {
        provider: 'yousign',
        payload: {
          name: contract.title,
          description: contract.body ?? undefined,
          delivery_mode: 'email',
          signers: [
            {
              info: {
                first_name: contract.contact?.firstName ?? 'Client',
                last_name: contract.contact?.lastName ?? 'Signataire',
                email: signerEmail,
              },
              signature_level: 'electronic_signature',
            },
          ],
          metadata: sharedMetadata,
        },
      };
    }

    if (normalized === 'docusign') {
      return {
        provider: 'docusign',
        payload: {
          emailSubject: `Signature requise - ${contract.title}`,
          status: 'sent',
          recipients: {
            signers: [
              {
                name: signerName || 'Signataire',
                email: signerEmail,
                recipientId: '1',
                routingOrder: '1',
              },
            ],
          },
          customFields: { textCustomFields: Object.entries(sharedMetadata).map(([name, value]) => ({ name, value })) },
        },
      };
    }

    return {
      provider: normalized,
      payload: {
        contractId: contract.id,
        title: contract.title,
        signerName,
        signerEmail,
        metadata: sharedMetadata,
      },
    };
  }

  private async ensureFolder(folderId: string | undefined, user: AuthUser) {
    if (!folderId) return null;
    const folder = await this.prisma.contractFolder.findFirst({
      where: { id: folderId, organizationId: user.organizationId },
    });
    if (!folder) throw new NotFoundException('Dossier de contrat introuvable');
    return folder;
  }

  private applyTemplatePlaceholders(
    templateContent: string,
    context: {
      organizationName: string;
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
      } | null;
    },
  ) {
    const contactFullName = [context.contact?.firstName, context.contact?.lastName].filter(Boolean).join(' ');
    const replacements: Record<string, string> = {
      '{{organization.name}}': context.organizationName || '',
      '{{contact.firstName}}': context.contact?.firstName || '',
      '{{contact.lastName}}': context.contact?.lastName || '',
      '{{contact.fullName}}': contactFullName,
      '{{contact.email}}': context.contact?.email || '',
      '{{contact.phone}}': context.contact?.phone || '',
      '{{contact.jobTitle}}': context.contact?.jobTitle || '',
      '{{account.name}}': context.account?.name || '',
      '{{account.email}}': context.account?.email || '',
      '{{account.phone}}': context.account?.phone || '',
      '{{account.website}}': context.account?.website || '',
      '{{account.address}}': context.account?.address || '',
      '{{account.city}}': context.account?.city || '',
      '{{account.country}}': context.account?.country || '',
      '{{deal.title}}': context.deal?.title || '',
      '{{date.today}}': new Date().toLocaleDateString('fr-FR'),
    };
    return Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.split(key).join(value),
      templateContent,
    );
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

    await this.ensureFolder(dto.folderId, user);

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
        activityType: dto.activityType ?? 'autre',
        folderId: dto.folderId,
        folderPath: dto.folderPath,
        templateId: dto.templateId,
        organizationId: user.organizationId,
      },
      include: {
        deal: { select: { id: true, title: true } },
        quote: { select: { id: true, title: true, reference: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        account: { select: { id: true, name: true } },
        document: { select: { id: true, filename: true } },
        folder: { select: { id: true, name: true, parentId: true } },
        template: { select: { id: true, title: true, activityType: true } },
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

    let contactId = quote.contactId ?? undefined;
    let accountId = quote.accountId ?? undefined;
    if (quote.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: quote.dealId, organizationId: user.organizationId },
        select: { contactId: true, accountId: true },
      });
      contactId = contactId ?? deal?.contactId ?? undefined;
      accountId = accountId ?? deal?.accountId ?? undefined;
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
        contactId,
        accountId,
        currency: quote.currency,
        value: quote.totalAmount != null ? Number(quote.totalAmount) : undefined,
        activityType: quote.prestationType ?? 'autre',
      },
      user,
    );
  }

  async createFromTemplate(dto: CreateContractFromTemplateDto, user: AuthUser) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: dto.templateId, organizationId: user.organizationId },
    });
    if (!template) throw new NotFoundException('Modèle de contrat introuvable');
    await this.ensureFolder(dto.folderId, user);

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
    let deal = dto.dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dto.dealId, organizationId: user.organizationId },
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
    const body = this.applyTemplatePlaceholders(template.content, {
      organizationName: org?.name ?? '',
      contact,
      account,
      deal,
    });

    return this.create(
      {
        title: dto.title || template.title,
        body,
        contactId: contact?.id,
        accountId: account?.id,
        dealId: deal?.id,
        folderId: dto.folderId,
        folderPath: dto.folderPath,
        currency: dto.currency ?? 'EUR',
        value: dto.value,
        activityType: template.activityType,
        templateId: template.id,
      },
      user,
    );
  }

  async findAll(pagination: PaginationDto, user: AuthUser, dealId?: string) {
    const { page = 1, limit = 20, search, status, type, contactId, accountId } = pagination;
    const skip = (page - 1) * limit;
    const statuses = status?.split(',').map((s) => s.trim()).filter(Boolean);

    const where: Prisma.ContractWhereInput = {
      organizationId: user.organizationId,
      ...(dealId && { dealId }),
      ...(contactId && { contactId }),
      ...(accountId && { accountId }),
      ...(pagination.folderId && { folderId: pagination.folderId }),
      ...(type && { activityType: type as ContractActivityType }),
      ...(statuses?.length && { status: { in: statuses as ContractStatus[] } }),
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
          account: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true, parentId: true } },
          template: { select: { id: true, title: true, activityType: true } },
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
        folder: true,
        template: true,
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
    await this.ensureFolder(dto.folderId ?? existing.folderId ?? undefined, user);

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
        folder: true,
        template: true,
        document: true,
      },
    });
  }

  async listFolders(user: AuthUser) {
    return this.prisma.contractFolder.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { contracts: true } } },
    });
  }

  async createFolder(dto: CreateContractFolderDto, user: AuthUser) {
    if (dto.parentId) {
      const parent = await this.prisma.contractFolder.findFirst({
        where: { id: dto.parentId, organizationId: user.organizationId },
      });
      if (!parent) throw new NotFoundException('Dossier parent introuvable');
    }

    const slug = this.slugify(dto.name);
    const existing = await this.prisma.contractFolder.findFirst({
      where: {
        organizationId: user.organizationId,
        parentId: dto.parentId ?? null,
        slug,
      },
    });
    if (existing) throw new BadRequestException('Un dossier du même nom existe déjà');

    return this.prisma.contractFolder.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId,
        organizationId: user.organizationId,
      },
      include: { _count: { select: { contracts: true } } },
    });
  }

  async updateFolder(id: string, dto: Partial<CreateContractFolderDto>, user: AuthUser) {
    const existing = await this.prisma.contractFolder.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Dossier introuvable');
    if (dto.parentId === id) {
      throw new BadRequestException('Un dossier ne peut pas être son propre parent');
    }

    const nextName = dto.name?.trim() || existing.name;
    const nextParentId = dto.parentId === undefined ? existing.parentId : dto.parentId;
    const slug = this.slugify(nextName);

    const duplicate = await this.prisma.contractFolder.findFirst({
      where: {
        organizationId: user.organizationId,
        parentId: nextParentId ?? null,
        slug,
        NOT: { id },
      },
    });
    if (duplicate) throw new BadRequestException('Un dossier du même nom existe déjà');

    return this.prisma.contractFolder.update({
      where: { id },
      data: {
        name: nextName,
        slug,
        parentId: nextParentId,
      },
      include: { _count: { select: { contracts: true } } },
    });
  }

  async removeFolder(id: string, user: AuthUser) {
    const existing = await this.prisma.contractFolder.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Dossier introuvable');
    await this.prisma.contractFolder.delete({ where: { id } });
    return { message: 'Dossier supprimé' };
  }

  async listTemplates(user: AuthUser, activityType?: ContractActivityType) {
    return this.prisma.contractTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(activityType && { activityType }),
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createTemplate(dto: CreateContractTemplateDto, user: AuthUser) {
    return this.prisma.contractTemplate.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }

  async updateTemplate(id: string, dto: Partial<CreateContractTemplateDto>, user: AuthUser) {
    const existing = await this.prisma.contractTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Modèle de contrat introuvable');

    return this.prisma.contractTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async removeTemplate(id: string, user: AuthUser) {
    const existing = await this.prisma.contractTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Modèle de contrat introuvable');
    await this.prisma.contractTemplate.delete({ where: { id } });
    return { message: 'Modèle supprimé' };
  }

  async moveContractToFolder(id: string, dto: MoveContractFolderDto, user: AuthUser) {
    await this.findOne(id, user);
    await this.ensureFolder(dto.folderId, user);
    return this.prisma.contract.update({
      where: { id },
      data: {
        folderId: dto.folderId ?? null,
        folderPath: dto.folderPath ?? null,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true, parentId: true } },
      },
    });
  }

  private async dispatchSignatureReminder(
    contract: { id: string; title: string; contactId: string | null; signatureMetadata: Prisma.JsonValue },
    organizationId: string,
    opts?: { note?: string; stage?: 'manual' | 'auto_j3' | 'auto_j7'; triggeredByUserId?: string },
  ) {
    if (!contract.contactId) {
      throw new BadRequestException('Contact signataire manquant');
    }

    const stage = opts?.stage ?? 'manual';
    if (this.reminderAlreadySent(contract.signatureMetadata, stage) && stage !== 'manual') {
      return { message: 'Relance deja envoyee', contractId: contract.id, skipped: true };
    }

    const clientUser = await this.prisma.user.findFirst({
      where: { contactId: contract.contactId, organizationId },
    });
    if (clientUser) {
      await this.notifications.create({
        userId: clientUser.id,
        organizationId,
        type: 'contract_pending_signature',
        title: stage === 'manual' ? 'Relance signature contrat' : 'Rappel signature contrat',
        body:
          opts?.note ||
          `Relance: le contrat « ${contract.title} » est toujours en attente de votre signature.`,
        payload: { contractId: contract.id, kind: 'signature_reminder', stage },
      });
    }

    const org = await this.orgSettings(organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const reminderWebhookUrl = settings.contractSignatureReminderWebhookUrl as string | undefined;
    const reminderWebhookSecret = settings.contractSignatureReminderWebhookSecret as string | undefined;
    if (reminderWebhookUrl) {
      await this.webhooks.dispatch({
        url: reminderWebhookUrl,
        secret: reminderWebhookSecret,
        payload: {
          event: 'contract.signature.reminder',
          organizationId,
          contractId: contract.id,
          title: contract.title,
          contactId: contract.contactId,
          note: opts?.note,
          stage,
        },
      });
    }

    const previousMetadata = this.asMetadataRecord(contract.signatureMetadata);
    const previousHistory = Array.isArray(previousMetadata.reminderHistory)
      ? [...previousMetadata.reminderHistory]
      : [];
    previousHistory.push({
      stage,
      sentAt: new Date().toISOString(),
      note: opts?.note ?? null,
      triggeredByUserId: opts?.triggeredByUserId ?? null,
    });

    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        signatureMetadata: {
          ...previousMetadata,
          reminderHistory: previousHistory,
        } as Prisma.InputJsonValue,
      },
    });

    return { message: 'Relance envoyee', contractId: contract.id, stage };
  }

  private async patchContractOnboardingMeta(contractId: string, projectId: string) {
    const row = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { signatureMetadata: true },
    });
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        signatureMetadata: {
          ...this.asMetadataRecord(row?.signatureMetadata),
          onboardingProjectId: projectId,
        } as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Tunnel métier : après signature, deal → won si besoin, création idempotente d’un projet
   * d’onboarding (tag tunnel_onboarding) avec phases par défaut.
   * Désactivable : organization.settings.disableAutoOnboardingProject === true
   */
  private async ensureTunnelOnboardingProject(contract: {
    id: string;
    organizationId: string;
    dealId: string | null;
    contactId: string | null;
    title: string;
    signatureMetadata: Prisma.JsonValue;
  }) {
    if (!contract.dealId) return;

    const org = await this.orgSettings(contract.organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings.disableAutoOnboardingProject === true) return;

    const meta = this.asMetadataRecord(contract.signatureMetadata);
    const linkedId = typeof meta.onboardingProjectId === 'string' ? meta.onboardingProjectId : null;
    if (linkedId) {
      const exists = await this.prisma.project.findFirst({
        where: { id: linkedId, organizationId: contract.organizationId },
      });
      if (exists) return;
    }

    const tunnelProject = await this.prisma.project.findFirst({
      where: {
        organizationId: contract.organizationId,
        dealId: contract.dealId,
        tags: { has: 'tunnel_onboarding' },
      },
    });
    if (tunnelProject) {
      await this.patchContractOnboardingMeta(contract.id, tunnelProject.id);
      return;
    }

    const deal = await this.prisma.deal.findFirst({
      where: { id: contract.dealId, organizationId: contract.organizationId },
    });
    if (!deal || deal.stage === 'lost') return;

    if (deal.stage !== 'won') {
      const previousStage = deal.stage;
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: { stage: 'won', closedAt: deal.closedAt ?? new Date() },
      });
      const refreshed = await this.prisma.deal.findFirst({
        where: { id: deal.id },
        include: { contact: true, account: true },
      });
      if (refreshed) {
        await this.automations.trigger(
          'deal.stage_changed',
          { ...refreshed, previousStage },
          contract.organizationId,
        );
        await this.automations.trigger('deal.won', refreshed, contract.organizationId);
      }
    }

    const project = await this.prisma.project.create({
      data: {
        organizationId: contract.organizationId,
        dealId: contract.dealId,
        contactId: contract.contactId ?? deal.contactId,
        name: `Onboarding — ${deal.title}`,
        description: `Projet cree automatiquement apres signature du contrat « ${contract.title} ».`,
        status: 'not_started',
        offerType: deal.offerType,
        tags: ['tunnel_onboarding'],
      },
    });

    await this.projectTemplates.instantiateForProjectByOrg(project.id, contract.organizationId);

    await this.prisma.projectPhase.updateMany({
      where: { projectId: project.id, key: 'contract' },
      data: { status: 'completed', completedAt: new Date() },
    });

    await this.patchContractOnboardingMeta(contract.id, project.id);

    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: { deal: true, contact: true },
    });
    if (fullProject) {
      await this.automations.trigger('project.created', fullProject, contract.organizationId);
    }
  }

  private async finalizeSignature(
    contractId: string,
    organizationId: string,
    opts: {
      signedByContactId?: string;
      ip?: string;
      userAgent?: string;
      extraMetadata?: Record<string, unknown>;
    } = {},
  ) {
    const before = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { signatureMetadata: true },
    });
    const prevMeta = this.asMetadataRecord(before?.signatureMetadata);

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signedByContactId: opts.signedByContactId,
        signatoryIp: opts.ip,
        signatoryUserAgent: opts.userAgent,
        portalToken: null,
        portalTokenExpiresAt: null,
        signatureMetadata: {
          ...prevMeta,
          at: new Date().toISOString(),
          ...(opts.extraMetadata ?? {}),
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
          signedByContactId: updated.signedByContactId ?? null,
        },
      },
      organizationId,
    );

    await this.ensureTunnelOnboardingProject(updated);

    const org = await this.orgSettings(organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const webhookUrl = settings.contractSignedWebhookUrl as string | undefined;
    const webhookSecret = settings.contractSignedWebhookSecret as string | undefined;
    const signatureMetaRow = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { signatureMetadata: true },
    });
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
            contactId: updated.contactId,
            signedAt: updated.signedAt,
            signatureMetadata: signatureMetaRow?.signatureMetadata ?? updated.signatureMetadata,
          },
        });
      } catch {
        /* log only in WebhooksService */
      }
    }

    return (
      (await this.prisma.contract.findFirst({
        where: { id: contractId },
        include: {
          deal: { select: { id: true, title: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          quote: { select: { id: true } },
        },
      })) ?? updated
    );
  }

  private generatePortalToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async markToModify(id: string, user: AuthUser) {
    const c = await this.findOne(id, user);
    if (c.status === 'signed' || c.status === 'cancelled') {
      throw new BadRequestException('Ce contrat ne peut pas revenir au statut "à modifier"');
    }
    return this.prisma.contract.update({
      where: { id },
      data: { status: 'to_modify' },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async sendForSignature(id: string, user: AuthUser, dto?: SendForSignatureDto) {
    const c = await this.findOne(id, user);
    if (c.status !== 'draft' && c.status !== 'to_modify') {
      throw new BadRequestException('Seul un contrat en brouillon/à modifier peut être envoyé pour signature');
    }
    if (!c.contactId) {
      throw new BadRequestException('Associez un contact signataire au contrat');
    }
    await this.ensureFolder(c.folderId ?? undefined, user);

    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    const provider = dto?.provider ?? c.signatureProvider ?? 'internal_portal';
    const org = await this.orgSettings(user.organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const externalProviderName = (settings.externalSignatureProvider as string | undefined) ?? 'generic';
    const externalCallbackUrl = settings.contractExternalCallbackUrl as string | undefined;
    const webhookUrl =
      provider === 'external_webhook'
        ? dto?.externalWebhookUrl || (settings.contractSignatureRequestWebhookUrl as string | undefined)
        : undefined;
    const webhookSecret =
      provider === 'external_webhook'
        ? dto?.externalWebhookSecret || (settings.contractSignatureRequestWebhookSecret as string | undefined)
        : undefined;
    if (provider === 'external_webhook' && !webhookUrl) {
      throw new BadRequestException(
        'URL webhook de signature externe manquante (paramètre organisation ou payload)',
      );
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: 'sent_for_signature',
        signatureProvider: provider,
        sentForSignatureAt: new Date(),
        portalToken: this.generatePortalToken(),
        portalTokenExpiresAt: expires,
        signatureMetadata: {
          ...this.asMetadataRecord(c.signatureMetadata),
          reminderHistory: [],
          providerStatus: provider === 'external_webhook' ? 'requested' : 'internal_pending',
          providerEventHistory:
            provider === 'external_webhook'
              ? [
                  {
                    eventType: 'requested',
                    providerStatus: 'requested',
                    at: new Date().toISOString(),
                  },
                ]
              : [],
        } as Prisma.InputJsonValue,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: true,
        document: true,
      },
    });

    if (provider === 'external_webhook') {
      const providerPayload = this.buildExternalProviderPayload(externalProviderName, updated, user.organizationId);
      await this.webhooks.dispatch({
        url: webhookUrl as string,
        secret: webhookSecret,
        payload: {
          event: 'contract.signature.requested',
          organizationId: user.organizationId,
          contractId: updated.id,
          title: updated.title,
          contactId: updated.contactId,
          accountId: updated.accountId,
          dealId: updated.dealId,
          provider,
          providerTarget: providerPayload.provider,
          providerPayload: providerPayload.payload,
          callback: externalCallbackUrl
            ? {
                url: externalCallbackUrl,
                contractId: updated.id,
              }
            : undefined,
        },
      });
    }

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

  async remindForSignature(id: string, dto: SignatureReminderDto | undefined, user: AuthUser) {
    const c = await this.findOne(id, user);
    if (c.status !== 'sent_for_signature') {
      throw new BadRequestException('Le contrat doit être en attente de signature');
    }
    return this.dispatchSignatureReminder(c, user.organizationId, {
      note: dto?.note,
      stage: dto?.stage ?? 'manual',
      triggeredByUserId: user.id,
    });
  }

  async remindForSignatureByEnvelope(dto: EnvelopeReminderDto, user: AuthUser) {
    const contract = await this.findContractByEnvelopeId(user.organizationId, dto.providerEnvelopeId);
    if (!contract) {
      throw new NotFoundException('Aucun contrat en attente pour ce providerEnvelopeId');
    }
    if (contract.status !== 'sent_for_signature') {
      throw new BadRequestException('Le contrat associe n est pas en attente de signature');
    }
    return this.dispatchSignatureReminder(contract, user.organizationId, {
      note:
        dto.note ??
        `Relance ciblee prestataire (${dto.providerEnvelopeId}): signature toujours en attente.`,
      stage: 'manual',
      triggeredByUserId: user.id,
    });
  }

  async updateProviderStatus(id: string, dto: ProviderStatusUpdateDto, user: AuthUser) {
    const contract = await this.findOne(id, user);
    if (contract.signatureProvider !== 'external_webhook') {
      throw new BadRequestException('Mise a jour provider reservee aux signatures externes');
    }
    if (contract.status !== 'sent_for_signature') {
      throw new BadRequestException('Le contrat doit etre en attente de signature');
    }

    const lifecycle = await this.applyProviderLifecycleEvent(
      {
        id: contract.id,
        organizationId: user.organizationId,
        contactId: contract.contactId,
        signatureMetadata: contract.signatureMetadata,
      },
      {
        providerStatus: dto.status,
        eventType: dto.status,
        providerEnvelopeId: dto.providerEnvelopeId,
        failureReason: dto.reason,
      },
    );
    return { message: 'Statut provider mis a jour', ...lifecycle };
  }

  async markSignedByExternalProvider(id: string, dto: ExternalSignatureCallbackDto, user: AuthUser) {
    const c = await this.findOne(id, user);
    if (c.status === 'signed') {
      return c;
    }
    if (c.status !== 'sent_for_signature') {
      throw new BadRequestException('Ce contrat ne peut pas être signé par callback externe');
    }

    const org = await this.orgSettings(user.organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const expectedSecret = settings.contractExternalCallbackSecret as string | undefined;
    if (expectedSecret && dto.callbackSecret !== expectedSecret) {
      throw new BadRequestException('Secret callback externe invalide');
    }

    const lifecycle = await this.applyProviderLifecycleEvent(c, dto);
    if (lifecycle && lifecycle.providerStatus !== 'signed') {
      return { message: 'Evenement provider enregistre', ...lifecycle };
    }

    return this.finalizeSignature(c.id, user.organizationId, {
      signedByContactId: c.contactId ?? undefined,
      extraMetadata: {
        provider: 'external_webhook',
        providerEnvelopeId: dto.providerEnvelopeId,
        providerStatus: 'signed',
        providerEventId: dto.providerEventId,
        signerName: dto.signerName,
        signedAtProvider: dto.signedAt,
        evidenceUrl: dto.evidenceUrl,
        evidenceHash: dto.evidenceHash,
        callbackReceivedAt: new Date().toISOString(),
      },
    });
  }

  async markSignedByExternalProviderPublic(
    id: string | undefined,
    dto: ExternalSignatureCallbackDto,
    callbackSecretFromHeader?: string,
  ) {
    const target =
      id != null
        ? await this.prisma.contract.findUnique({
            where: { id },
            select: { id: true, status: true, contactId: true, organizationId: true, signatureMetadata: true },
          })
        : await this.resolveExternalCallbackTarget(dto);
    const c = target;
    if (!c) throw new NotFoundException('Contrat introuvable');
    if (c.status === 'signed') {
      return { message: 'Contrat deja signe', contractId: c.id };
    }
    if (c.status !== 'sent_for_signature') {
      throw new BadRequestException('Ce contrat ne peut pas etre signe par callback externe');
    }

    const org = await this.orgSettings(c.organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const expectedSecret = settings.contractExternalCallbackSecret as string | undefined;
    const providedSecret = callbackSecretFromHeader || dto.callbackSecret;
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new BadRequestException('Secret callback externe invalide');
    }

    const lifecycle = await this.applyProviderLifecycleEvent(c, dto);
    if (lifecycle && lifecycle.providerStatus !== 'signed') {
      return { message: 'Evenement provider enregistre', ...lifecycle };
    }

    return this.finalizeSignature(c.id, c.organizationId, {
      signedByContactId: c.contactId ?? undefined,
      extraMetadata: {
        provider: 'external_webhook',
        providerEnvelopeId: dto.providerEnvelopeId,
        providerStatus: 'signed',
        providerEventId: dto.providerEventId,
        signerName: dto.signerName,
        signedAtProvider: dto.signedAt,
        evidenceUrl: dto.evidenceUrl,
        evidenceHash: dto.evidenceHash,
        callbackReceivedAt: new Date().toISOString(),
      },
    });
  }

  async runAutoSignatureReminders() {
    const now = Date.now();
    const pendingContracts = await this.prisma.contract.findMany({
      where: { status: 'sent_for_signature', sentForSignatureAt: { not: null } },
      select: {
        id: true,
        title: true,
        contactId: true,
        sentForSignatureAt: true,
        organizationId: true,
        signatureMetadata: true,
      },
    });

    let remindersSent = 0;
    for (const contract of pendingContracts) {
      if (!contract.sentForSignatureAt || !contract.contactId) continue;
      const elapsedDays = Math.floor((now - contract.sentForSignatureAt.getTime()) / (1000 * 60 * 60 * 24));
      let stage: 'auto_j3' | 'auto_j7' | null = null;
      if (elapsedDays >= 7) stage = 'auto_j7';
      else if (elapsedDays >= 3) stage = 'auto_j3';
      if (!stage) continue;
      if (this.reminderAlreadySent(contract.signatureMetadata, stage)) continue;

      const note =
        stage === 'auto_j7'
          ? `Rappel J+7: le contrat « ${contract.title} » attend toujours votre signature.`
          : `Rappel J+3: le contrat « ${contract.title} » est en attente de votre signature.`;

      const result = await this.dispatchSignatureReminder(contract, contract.organizationId, { note, stage });
      if (!('skipped' in result && result.skipped)) remindersSent += 1;
    }

    return { scanned: pendingContracts.length, remindersSent };
  }

  async getContractAudit(id: string, user: AuthUser) {
    const contract = await this.findOne(id, user);
    const metadata = this.asMetadataRecord(contract.signatureMetadata);
    const reminderHistory = Array.isArray(metadata.reminderHistory) ? metadata.reminderHistory : [];
    const providerEventHistory = Array.isArray(metadata.providerEventHistory)
      ? metadata.providerEventHistory
      : [];
    const providerFailureReason =
      typeof metadata.providerFailureReason === 'string' ? metadata.providerFailureReason : null;
    const providerRecommendedAction =
      typeof metadata.providerRecommendedAction === 'string' ? metadata.providerRecommendedAction : null;
    const events = await this.listEventTimeline(user, { limit: 200, contractId: id, scope: 'all' });

    return {
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        signatureProvider: contract.signatureProvider,
        sentForSignatureAt: contract.sentForSignatureAt,
        signedAt: contract.signedAt,
        signedByContactId: contract.signedByContactId,
        signatoryIp: contract.signatoryIp,
        signatoryUserAgent: contract.signatoryUserAgent,
      },
      evidence: {
        signatureMetadata: metadata,
        reminderHistory,
        providerEventHistory,
        providerFailureReason,
        providerRecommendedAction,
      },
      timeline: events.data,
      meta: events.meta,
    };
  }

  async exportContractAudit(id: string, user: AuthUser) {
    const audit = await this.getContractAudit(id, user);
    return {
      filename: `contract-audit-${audit.contract.id}.json`,
      generatedAt: new Date().toISOString(),
      data: audit,
    };
  }

  private createSimplePdfBuffer(lines: string[]) {
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const contentLines = [
      'BT',
      '/F1 10 Tf',
      '40 800 Td',
      ...lines.flatMap((line, index) => (index === 0 ? [`(${escape(line)}) Tj`] : ['0 -14 Td', `(${escape(line)}) Tj`])),
      'ET',
    ];
    const stream = contentLines.join('\n');

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${obj}\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
      const offset = String(offsets[i]).padStart(10, '0');
      pdf += `${offset} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  async exportContractAuditPdf(id: string, user: AuthUser) {
    const audit = await this.getContractAudit(id, user);
    const lines = [
      `Audit contrat: ${audit.contract.title}`,
      `Contract ID: ${audit.contract.id}`,
      `Status: ${audit.contract.status}`,
      `Signature provider: ${audit.contract.signatureProvider}`,
      `Sent at: ${audit.contract.sentForSignatureAt ?? '-'}`,
      `Signed at: ${audit.contract.signedAt ?? '-'}`,
      `Reminder count: ${audit.evidence.reminderHistory.length}`,
      `Provider events: ${audit.evidence.providerEventHistory?.length ?? 0}`,
      `Timeline events: ${audit.timeline.length}`,
      `Generated at: ${new Date().toISOString()}`,
    ];
    const buffer = this.createSimplePdfBuffer(lines);
    return {
      filename: `contract-audit-${audit.contract.id}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: buffer.toString('base64'),
    };
  }

  async getProductionReadinessChecklist(user: AuthUser) {
    const organizationId = user.organizationId;
    const org = await this.orgSettings(organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const requiredKeys = [
      'contractSignatureRequestWebhookUrl',
      'contractExternalCallbackSecret',
      'contractExternalCallbackUrl',
      'externalSignatureProvider',
    ];
    const recommendedKeys = [
      'contractSignedWebhookUrl',
      'communicationWebhookUrl',
      'contractSignatureReminderWebhookUrl',
    ];
    const requiredMissing = requiredKeys.filter((k) => !settings[k]);
    const recommendedMissing = recommendedKeys.filter((k) => !settings[k]);

    const [activeAdmins, activeContractsPending, recentSignedContracts] = await Promise.all([
      this.prisma.user.count({
        where: { organizationId, role: 'admin', isActive: true },
      }),
      this.prisma.contract.count({
        where: { organizationId, status: 'sent_for_signature' },
      }),
      this.prisma.contract.count({
        where: {
          organizationId,
          status: 'signed',
          signedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const checklist = [
      {
        id: 'required-settings',
        label: 'Configuration signature externe',
        status: requiredMissing.length === 0 ? 'pass' : 'fail',
        detail:
          requiredMissing.length === 0
            ? 'Toutes les cles critiques sont renseignees.'
            : `Cles manquantes: ${requiredMissing.join(', ')}`,
        recommendation:
          requiredMissing.length === 0
            ? 'Aucune action requise.'
            : 'Completer les cles dans Parametres organisation > JSON avance.',
      },
      {
        id: 'recommended-settings',
        label: 'Configuration communication et webhooks secondaires',
        status: recommendedMissing.length === 0 ? 'pass' : 'warn',
        detail:
          recommendedMissing.length === 0
            ? 'Webhooks de communication et reminders configures.'
            : `Cles recommandees manquantes: ${recommendedMissing.join(', ')}`,
        recommendation:
          recommendedMissing.length === 0
            ? 'Aucune action requise.'
            : 'Configurer ces cles pour un suivi production complet.',
      },
      {
        id: 'admin-coverage',
        label: 'Couverture operationnelle admin',
        status: activeAdmins >= 1 ? 'pass' : 'fail',
        detail: `${activeAdmins} admin(s) actif(s).`,
        recommendation: activeAdmins >= 1 ? 'OK.' : 'Activer au moins un administrateur superviseur.',
      },
      {
        id: 'signature-activity',
        label: 'Activite signature recente',
        status: recentSignedContracts > 0 ? 'pass' : 'warn',
        detail: `${recentSignedContracts} contrat(s) signes sur les 30 derniers jours.`,
        recommendation:
          recentSignedContracts > 0
            ? 'Pipeline signature actif.'
            : 'Lancer un test E2E de signature avant mise en production.',
      },
      {
        id: 'pending-load',
        label: 'Contrats en attente de signature',
        status: activeContractsPending > 0 ? 'warn' : 'pass',
        detail: `${activeContractsPending} contrat(s) actuellement en attente.`,
        recommendation:
          activeContractsPending > 0
            ? 'Verifier les relances automatiques et statuts provider.'
            : 'Aucun backlog signature actuel.',
      },
    ] as const;

    const score = checklist.filter((item) => item.status === 'pass').length;

    const rb = this.asMetadataRecord(settings.contractsProductionRunbook as Prisma.JsonValue | undefined);
    const storedStepsRaw = rb.steps;
    const storedSteps =
      storedStepsRaw && typeof storedStepsRaw === 'object' && !Array.isArray(storedStepsRaw)
        ? (storedStepsRaw as Record<string, unknown>)
        : {};
    const runbookSteps = CONTRACT_PRODUCTION_RUNBOOK_DEFINITIONS.map((def) => ({
      id: def.id,
      label: def.label,
      checked: storedSteps[def.id] === true,
    }));
    const runbookUpdatedAt = typeof rb.updatedAt === 'string' ? rb.updatedAt : null;

    return {
      checklist,
      summary: {
        score,
        total: checklist.length,
        readinessLevel: score >= 4 ? 'ready' : score >= 3 ? 'almost_ready' : 'not_ready',
      },
      runbook: {
        steps: runbookSteps,
        completed: runbookSteps.filter((s) => s.checked).length,
        total: runbookSteps.length,
        updatedAt: runbookUpdatedAt,
      },
    };
  }

  async patchContractsProductionRunbook(user: AuthUser, dto: ContractRunbookPatchDto) {
    const allowed = new Set(CONTRACT_PRODUCTION_RUNBOOK_DEFINITIONS.map((d) => d.id));
    const patches: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(dto.steps)) {
      if (!allowed.has(key)) continue;
      if (typeof val !== 'boolean') {
        throw new BadRequestException(`Valeur booleenne attendue pour la cle "${key}"`);
      }
      patches[key] = val;
    }

    if (Object.keys(dto.steps).length === 0) {
      throw new BadRequestException('steps doit contenir au moins une entree');
    }
    if (Object.keys(patches).length === 0) {
      throw new BadRequestException('Aucune cle de runbook reconnue');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');

    const prevSettings = this.asMetadataRecord(org.settings);
    const prevRb = this.asMetadataRecord(prevSettings.contractsProductionRunbook as Prisma.JsonValue | undefined);
    const prevStepsRaw = prevRb.steps;
    const prevStepsObj =
      prevStepsRaw && typeof prevStepsRaw === 'object' && !Array.isArray(prevStepsRaw)
        ? (prevStepsRaw as Record<string, unknown>)
        : {};

    const merged: Record<string, boolean> = {};
    for (const id of allowed) {
      const prevVal = prevStepsObj[id];
      merged[id] = typeof prevVal === 'boolean' ? prevVal : false;
    }
    Object.assign(merged, patches);

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...prevSettings,
          contractsProductionRunbook: {
            steps: merged,
            updatedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    return this.getProductionReadinessChecklist(user);
  }

  async testProductionWebhook(user: AuthUser, dto?: ProductionWebhookTestDto) {
    const org = await this.orgSettings(user.organizationId);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const channel = dto?.channel ?? 'communication';

    const byChannel: Record<string, { url?: string; secret?: string }> = {
      communication: {
        url: settings.communicationWebhookUrl as string | undefined,
        secret: settings.communicationWebhookSecret as string | undefined,
      },
      signature_request: {
        url: settings.contractSignatureRequestWebhookUrl as string | undefined,
        secret: settings.contractSignatureRequestWebhookSecret as string | undefined,
      },
      signature_signed: {
        url: settings.contractSignedWebhookUrl as string | undefined,
        secret: settings.contractSignedWebhookSecret as string | undefined,
      },
      signature_reminder: {
        url: settings.contractSignatureReminderWebhookUrl as string | undefined,
        secret: settings.contractSignatureReminderWebhookSecret as string | undefined,
      },
    };

    const selected = byChannel[channel];
    const url = dto?.customUrl || selected?.url;
    if (!url) {
      throw new BadRequestException('Aucune URL webhook configuree pour ce canal');
    }

    await this.webhooks.dispatch({
      url,
      secret: selected?.secret,
      payload: {
        event: 'ops.production.webhook_test',
        channel,
        organizationId: user.organizationId,
        at: new Date().toISOString(),
      },
    });

    return { message: 'Webhook de test envoye', channel, url };
  }

  async listEventTimeline(user: AuthUser, query: ContractEventsQueryDto) {
    const limit = query.limit ?? 80;
    const scope = query.scope ?? 'all';
    const includeContracts = scope === 'all' || scope === 'contracts';
    const includeDocuments = scope === 'all' || scope === 'documents';
    const includeMessages = scope === 'all' || scope === 'messages';
    const includeNotifications = scope === 'all' || scope === 'notifications';

    const [contracts, documents, messages, notifications] = await Promise.all([
      includeContracts
        ? this.prisma.contract.findMany({
            where: {
              organizationId: user.organizationId,
              ...(query.contractId && { id: query.contractId }),
              ...(query.contactId && { contactId: query.contactId }),
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              sentForSignatureAt: true,
              signedAt: true,
              contactId: true,
              signatureMetadata: true,
            },
          })
        : Promise.resolve([]),
      includeDocuments
        ? this.prisma.document.findMany({
            where: {
              organizationId: user.organizationId,
              ...(query.contactId && { contactId: query.contactId }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, filename: true, createdAt: true, contactId: true },
          })
        : Promise.resolve([]),
      includeMessages
        ? this.prisma.message.findMany({
            where: {
              organizationId: user.organizationId,
              ...(query.contactId && { contactId: query.contactId }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, role: true } },
              recipient: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          })
        : Promise.resolve([]),
      includeNotifications
        ? this.prisma.notification.findMany({
            where: {
              organizationId: user.organizationId,
              type: {
                in: ['contract_pending_signature', 'contract_signed', 'document_uploaded', 'message_received'],
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, type: true, title: true, body: true, payload: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const events: Array<Record<string, unknown>> = [];

    for (const contract of contracts) {
      const metadata = this.asMetadataRecord(contract.signatureMetadata);
      events.push({
        id: `contract-created-${contract.id}`,
        kind: 'contract_created',
        timestamp: contract.createdAt,
        title: 'Contrat cree',
        description: `Contrat « ${contract.title} » cree.`,
        entityType: 'contract',
        entityId: contract.id,
        contractId: contract.id,
        contactId: contract.contactId,
      });
      if (contract.sentForSignatureAt) {
        events.push({
          id: `contract-sent-${contract.id}`,
          kind: 'contract_sent_for_signature',
          timestamp: contract.sentForSignatureAt,
          title: 'Contrat envoye pour signature',
          description: `Le contrat « ${contract.title} » a ete envoye pour signature.`,
          entityType: 'contract',
          entityId: contract.id,
          contractId: contract.id,
          contactId: contract.contactId,
        });
      }
      if (contract.signedAt) {
        events.push({
          id: `contract-signed-${contract.id}`,
          kind: 'contract_signed',
          timestamp: contract.signedAt,
          title: 'Contrat signe',
          description: `Le contrat « ${contract.title} » est signe.`,
          entityType: 'contract',
          entityId: contract.id,
          contractId: contract.id,
          contactId: contract.contactId,
        });
      }
      const providerHistory = Array.isArray(metadata.providerEventHistory)
        ? (metadata.providerEventHistory as Array<Record<string, unknown>>)
        : [];
      for (const [index, providerEvent] of providerHistory.entries()) {
        const atValue = providerEvent.at;
        const at = typeof atValue === 'string' ? atValue : undefined;
        if (!at) continue;
        const providerStatus = String(providerEvent.providerStatus ?? providerEvent.eventType ?? 'provider_event');
        const recommendedAction =
          typeof providerEvent.recommendedAction === 'string' ? providerEvent.recommendedAction : '';
        events.push({
          id: `contract-provider-${contract.id}-${index}`,
          kind: `provider_${providerStatus}`,
          timestamp: at,
          title: 'Mise a jour prestataire signature',
          description: `Provider status: ${providerStatus}.${recommendedAction ? ` Action: ${recommendedAction}` : ''}`,
          entityType: 'contract',
          entityId: contract.id,
          contractId: contract.id,
          contactId: contract.contactId,
        });
      }
    }

    for (const document of documents) {
      events.push({
        id: `document-${document.id}`,
        kind: 'document_shared',
        timestamp: document.createdAt,
        title: 'Document partage',
        description: `Document « ${document.filename} » partage.`,
        entityType: 'document',
        entityId: document.id,
        contactId: document.contactId,
      });
    }

    for (const message of messages) {
      const senderName = [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ').trim();
      const recipientName = [message.recipient.firstName, message.recipient.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      events.push({
        id: `message-${message.id}`,
        kind: 'message_exchanged',
        timestamp: message.createdAt,
        title: 'Message echange',
        description: `${senderName || 'Expediteur'} -> ${recipientName || 'Destinataire'} : ${message.content.slice(0, 140)}`,
        entityType: 'message',
        entityId: message.id,
        contactId: message.contactId,
      });
    }

    for (const notification of notifications) {
      const payload = this.asMetadataRecord(notification.payload);
      events.push({
        id: `notification-${notification.id}`,
        kind: notification.type,
        timestamp: notification.createdAt,
        title: notification.title,
        description: notification.body ?? '',
        entityType: 'notification',
        entityId: notification.id,
        contractId: typeof payload.contractId === 'string' ? payload.contractId : undefined,
        contactId: typeof payload.contactId === 'string' ? payload.contactId : undefined,
      });
    }

    const filteredByContact = query.contactId
      ? events.filter((event) => !event.contactId || event.contactId === query.contactId)
      : events;
    const filtered = query.contractId
      ? filteredByContact.filter((event) => !event.contractId || event.contractId === query.contractId)
      : filteredByContact;

    const data = filtered
      .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime())
      .slice(0, limit);

    return { data, meta: { total: data.length, limit, scope } };
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

    return this.finalizeSignature(c.id, organizationId, {
      signedByContactId: contactId,
      ip: opts.ip,
      userAgent: opts.userAgent,
      extraMetadata: {
        provider: 'internal_portal',
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.contract.delete({ where: { id } });
    return { message: 'Contrat supprimé' };
  }
}
