import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SupabaseService } from '../config/supabase.service';
import { AuthUser } from '@crm/shared';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { assertTicketAttachmentQuota } from './ticket-attachment-quota.helper';

export interface UploadDocumentOptions {
  file: Express.Multer.File;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  accountId?: string;
  ticketId?: string;
  description?: string;
  organizationId: string;
}

type DocumentSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
type DocumentLinkedTo = 'deal' | 'project' | 'contact' | 'account' | 'ticket' | 'unlinked';

@Injectable()
export class DocumentsService {
  private readonly BUCKET = 'documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
  ) {}

  private async notifyTicketAttachment(
    document: {
      id: string;
      filename: string;
      ticketId?: string | null;
      contactId: string | null;
      projectId: string | null;
      accountId: string | null;
    },
    user: AuthUser,
  ) {
    if (!document.ticketId) return;

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: document.ticketId, organizationId: user.organizationId },
      select: { id: true, title: true, ticketNumber: true, contactId: true },
    });
    if (!ticket) return;

    if (user.role === 'client') {
      const team = await this.prisma.user.findMany({
        where: { organizationId: user.organizationId, role: { in: ['admin', 'member'] }, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        team.map((u) =>
          this.notifications.create({
            userId: u.id,
            organizationId: user.organizationId,
            type: 'ticket_comment',
            title: 'Pièce jointe sur ticket',
            body: `« ${document.filename} » — ${ticket.title}`.slice(0, 200),
            payload: { ticketId: ticket.id, documentId: document.id },
          }),
        ),
      );
    } else if (ticket.contactId) {
      const clientUser = await this.prisma.user.findFirst({
        where: {
          organizationId: user.organizationId,
          role: 'client',
          contactId: ticket.contactId,
          isActive: true,
        },
        select: { id: true },
      });
      if (clientUser) {
        await this.notifications.create({
          userId: clientUser.id,
          organizationId: user.organizationId,
          type: 'ticket_comment',
          title: 'Document ajouté au ticket',
          body: `« ${document.filename} » — ticket #${ticket.ticketNumber}`,
          payload: { ticketId: ticket.id, documentId: document.id },
        });
      }
    }
  }

  private async notifyDocumentShared(
    document: {
      id: string;
      filename: string;
      contactId: string | null;
      projectId: string | null;
      accountId: string | null;
      ticketId?: string | null;
    },
    user: AuthUser,
  ) {
    if (document.ticketId) {
      await this.notifyTicketAttachment(document, user);
      return;
    }

    if (user.role === 'client') {
      const admins = await this.prisma.user.findMany({
        where: { organizationId: user.organizationId, role: 'admin', isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notifications.create({
          userId: admin.id,
          organizationId: user.organizationId,
          type: 'document_uploaded',
          title: 'Nouveau document client',
          body: `Le client a envoyé « ${document.filename} ».`,
          payload: { documentId: document.id, from: 'client', contactId: document.contactId },
        });
      }
    } else if (document.contactId) {
      const clientUser = await this.prisma.user.findFirst({
        where: { organizationId: user.organizationId, role: 'client', contactId: document.contactId, isActive: true },
      });
      if (clientUser) {
        await this.notifications.create({
          userId: clientUser.id,
          organizationId: user.organizationId,
          type: 'document_uploaded',
          title: 'Nouveau document reçu',
          body: `Un document vous a été transmis: « ${document.filename} ».`,
          payload: { documentId: document.id, from: 'team', contactId: document.contactId },
        });
      }
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    const webhookUrl = settings.communicationWebhookUrl as string | undefined;
    const webhookSecret = settings.communicationWebhookSecret as string | undefined;
    if (webhookUrl) {
      await this.webhooks.dispatch({
        url: webhookUrl,
        secret: webhookSecret,
        payload: {
          event: 'document.shared',
          organizationId: user.organizationId,
          documentId: document.id,
          filename: document.filename,
          fromRole: user.role,
          contactId: document.contactId,
          projectId: document.projectId,
          accountId: document.accountId,
        },
      });
    }
  }

  async upload(options: UploadDocumentOptions, user: AuthUser) {
    const { file, dealId, accountId, description, ticketId } = options;
    const fileBytes = file.size > 0 ? file.size : file.buffer.length;
    const contactIdOpt = options.contactId;
    let projectIdOpt = options.projectId;

    let effectiveContactId =
      user.role === 'client' ? (user.contactId ?? null) : (contactIdOpt ?? null);

    if (ticketId) {
      const ticket = await this.prisma.ticket.findFirst({
        where: { id: ticketId, organizationId: user.organizationId },
        select: { id: true, contactId: true, projectId: true },
      });
      if (!ticket) throw new BadRequestException('Ticket invalide');
      if (user.role === 'client') {
        if (!user.contactId || ticket.contactId !== user.contactId) {
          throw new ForbiddenException('Ticket inaccessible');
        }
      }
      effectiveContactId = ticket.contactId ?? effectiveContactId;
      projectIdOpt = projectIdOpt ?? ticket.projectId ?? undefined;

      const orgForQuota = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { settings: true },
      });
      await assertTicketAttachmentQuota(
        this.prisma,
        user.organizationId,
        ticketId,
        fileBytes,
        orgForQuota?.settings,
      );
    }

    // Chemin unique dans Supabase Storage : org/uuid-filename
    const storagePath = `${user.organizationId}/${uuidv4()}-${file.originalname}`;

    await this.supabase.uploadFile(this.BUCKET, storagePath, file.buffer, file.mimetype);

    const created = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: fileBytes,
        storagePath,
        bucket: this.BUCKET,
        description,
        organizationId: user.organizationId,
        contactId: effectiveContactId,
        dealId: ticketId ? undefined : dealId,
        projectId: projectIdOpt,
        accountId: ticketId ? undefined : accountId,
        ticketId,
      },
    });

    await this.notifyDocumentShared(created, user);
    return created;
  }

  async findAll(
    organizationId: string,
    filters?: {
      contactId?: string;
      projectId?: string;
      dealId?: string;
      accountId?: string;
      ticketId?: string;
      q?: string;
      mimePrefix?: string;
      linkedTo?: DocumentLinkedTo;
      from?: string;
      to?: string;
      sort?: DocumentSort;
    },
  ) {
    const q = filters?.q?.trim();
    const mimePrefix = filters?.mimePrefix?.trim();
    const from = filters?.from?.trim();
    const to = filters?.to?.trim();
    const dateRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    const createdAt =
      from || to
        ? {
            ...(from
              ? (() => {
                  if (!dateRegex.test(from)) throw new BadRequestException('from doit être au format YYYY-MM-DD');
                  return { gte: new Date(`${from}T00:00:00.000Z`) };
                })()
              : {}),
            ...(to
              ? (() => {
                  if (!dateRegex.test(to)) throw new BadRequestException('to doit être au format YYYY-MM-DD');
                  return { lte: new Date(`${to}T23:59:59.999Z`) };
                })()
              : {}),
          }
        : undefined;
    const sort = filters?.sort ?? 'newest';
    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'name_asc'
          ? { filename: 'asc' as const }
          : sort === 'name_desc'
            ? { filename: 'desc' as const }
            : sort === 'size_asc'
              ? { size: 'asc' as const }
              : sort === 'size_desc'
                ? { size: 'desc' as const }
                : { createdAt: 'desc' as const };

    const linkedToWhere =
      filters?.linkedTo === 'deal'
        ? { dealId: { not: null } }
        : filters?.linkedTo === 'project'
          ? { projectId: { not: null } }
          : filters?.linkedTo === 'contact'
            ? { contactId: { not: null } }
            : filters?.linkedTo === 'account'
              ? { accountId: { not: null } }
              : filters?.linkedTo === 'ticket'
                ? { ticketId: { not: null } }
                : filters?.linkedTo === 'unlinked'
                  ? {
                      dealId: null,
                      projectId: null,
                      contactId: null,
                      accountId: null,
                      ticketId: null,
                    }
                  : {};

    return this.prisma.document.findMany({
      where: {
        organizationId,
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.dealId && { dealId: filters.dealId }),
        ...(filters?.accountId && { accountId: filters.accountId }),
        ...(filters?.ticketId && { ticketId: filters.ticketId }),
        ...(mimePrefix ? { mimeType: { startsWith: mimePrefix } } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...linkedToWhere,
        ...(q
          ? {
              OR: [
                { filename: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
                { mimeType: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy,
    });
  }

  async getSignedUrl(id: string, user: AuthUser): Promise<{ url: string; filename: string }> {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!document) throw new NotFoundException('Document introuvable');

    const url = await this.supabase.getSignedUrl(document.bucket, document.storagePath, 3600);
    return { url, filename: document.filename };
  }

  async remove(id: string, user: AuthUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!document) throw new NotFoundException('Document introuvable');

    await this.supabase.deleteFile(document.bucket, document.storagePath);
    await this.prisma.document.delete({ where: { id } });

    return { message: 'Document supprimé' };
  }
}
