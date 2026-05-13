import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SupabaseService } from '../config/supabase.service';
import { AuthUser } from '@crm/shared';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';

export interface UploadDocumentOptions {
  file: Express.Multer.File;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  accountId?: string;
  description?: string;
  organizationId: string;
}

@Injectable()
export class DocumentsService {
  private readonly BUCKET = 'documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
  ) {}

  private async notifyDocumentShared(
    document: { id: string; filename: string; contactId: string | null; projectId: string | null; accountId: string | null },
    user: AuthUser,
  ) {
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
    const { file, contactId, dealId, projectId, accountId, description } = options;
    const effectiveContactId = user.role === 'client' ? user.contactId ?? null : (contactId ?? null);

    // Chemin unique dans Supabase Storage : org/uuid-filename
    const storagePath = `${user.organizationId}/${uuidv4()}-${file.originalname}`;

    await this.supabase.uploadFile(this.BUCKET, storagePath, file.buffer, file.mimetype);

    const created = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        bucket: this.BUCKET,
        description,
        organizationId: user.organizationId,
        contactId: effectiveContactId,
        dealId,
        projectId,
        accountId,
      },
    });

    await this.notifyDocumentShared(created, user);
    return created;
  }

  async findAll(
    organizationId: string,
    filters?: { contactId?: string; projectId?: string; dealId?: string; accountId?: string },
  ) {
    return this.prisma.document.findMany({
      where: {
        organizationId,
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.dealId && { dealId: filters.dealId }),
        ...(filters?.accountId && { accountId: filters.accountId }),
      },
      orderBy: { createdAt: 'desc' },
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
