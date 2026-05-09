import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SupabaseService } from '../config/supabase.service';
import { AuthUser } from '@crm/shared';
import { v4 as uuidv4 } from 'uuid';

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
  ) {}

  async upload(options: UploadDocumentOptions, user: AuthUser) {
    const { file, contactId, dealId, projectId, accountId, description } = options;

    // Chemin unique dans Supabase Storage : org/uuid-filename
    const storagePath = `${user.organizationId}/${uuidv4()}-${file.originalname}`;

    await this.supabase.uploadFile(this.BUCKET, storagePath, file.buffer, file.mimetype);

    return this.prisma.document.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        bucket: this.BUCKET,
        description,
        organizationId: user.organizationId,
        contactId,
        dealId,
        projectId,
        accountId,
      },
    });
  }

  async findAll(
    organizationId: string,
    filters?: { contactId?: string; projectId?: string; dealId?: string },
  ) {
    return this.prisma.document.findMany({
      where: {
        organizationId,
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.dealId && { dealId: filters.dealId }),
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
