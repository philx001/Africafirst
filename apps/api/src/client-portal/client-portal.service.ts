import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../config/prisma.service';
import { SupabaseService } from '../config/supabase.service';
import { AuthUser } from '@crm/shared';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly contracts: ContractsService,
  ) {}
  /**
   * Vérifie que l'utilisateur est bien un client et retourne son contact_id
   */
  private assertClient(user: AuthUser): string {
    if (user.role !== 'client' || !user.contactId) {
      throw new ForbiddenException('Accès réservé aux clients');
    }
    return user.contactId;
  }

  /**
   * Dashboard client : résumé des projets, tâches en cours, documents récents
   */
  async getDashboard(user: AuthUser) {
    const contactId = this.assertClient(user);

    const [projects, recentDocuments, unreadMessages] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where: { contactId, organizationId: user.organizationId },
        include: {
          _count: { select: { tasks: true } },
          tasks: {
            where: { status: { not: 'done' } },
            orderBy: { dueAt: 'asc' },
            take: 5,
            select: { id: true, title: true, status: true, dueAt: true, priority: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      this.prisma.document.findMany({
        where: { contactId, organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
      }),

      this.prisma.message.count({
        where: { recipientId: user.id, organizationId: user.organizationId, readAt: null },
      }),
    ]);

    return { projects, recentDocuments, unreadMessages };
  }

  /**
   * Liste des projets du client
   */
  async getProjects(user: AuthUser) {
    const contactId = this.assertClient(user);

    return this.prisma.project.findMany({
      where: { contactId, organizationId: user.organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        tasks: {
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
          select: { id: true, title: true, status: true, dueAt: true, priority: true, completedAt: true },
        },
        _count: { select: { documents: true } },
      },
    });
  }

  /**
   * Documents accessibles par le client
   */
  async getDocuments(user: AuthUser) {
    const contactId = this.assertClient(user);

    return this.prisma.document.findMany({
      where: { contactId, organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * URL de téléchargement signé pour un document (vérification stricte du contactId)
   */
  async getDocumentSignedUrl(documentId: string, user: AuthUser): Promise<{ url: string }> {
    const contactId = this.assertClient(user);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, contactId, organizationId: user.organizationId },
    });

    if (!document) throw new NotFoundException('Document introuvable');

    const url = await this.supabase.getSignedUrl(document.bucket, document.storagePath, 3600);
    return { url };
  }

  /**
   * Messages reçus par le client
   */
  async getMessages(user: AuthUser) {
    this.assertClient(user);

    const messages = await this.prisma.message.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ senderId: user.id }, { recipientId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Marquer les messages reçus comme lus
    await this.prisma.message.updateMany({
      where: { recipientId: user.id, organizationId: user.organizationId, readAt: null },
      data: { readAt: new Date() },
    });

    return messages;
  }

  /**
   * Envoyer un message (réponse à l'équipe)
   */
  async sendMessage(user: AuthUser, content: string, projectId?: string) {
    this.assertClient(user);

    // Trouver un admin de l'organisation comme destinataire par défaut
    const admin = await this.prisma.user.findFirst({
      where: { organizationId: user.organizationId, role: 'admin' },
      select: { id: true },
    });

    if (!admin) throw new NotFoundException('Aucun administrateur disponible');

    return this.prisma.message.create({
      data: {
        content,
        senderId: user.id,
        recipientId: admin.id,
        organizationId: user.organizationId,
        projectId,
        contactId: user.contactId,
      },
    });
  }

  /**
   * Notifications du client
   */
  async getNotifications(user: AuthUser) {
    this.assertClient(user);

    return this.prisma.notification.findMany({
      where: { userId: user.id, organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /** Contrats envoyés pour signature ou déjà signés (contact connecté) */
  getContracts(user: AuthUser) {
    const contactId = this.assertClient(user);
    return this.contracts.findAllForContact(contactId, user.organizationId);
  }

  getContract(id: string, user: AuthUser) {
    const contactId = this.assertClient(user);
    return this.contracts.findOneForContact(id, contactId, user.organizationId);
  }

  async signContract(id: string, user: AuthUser, acknowledge: boolean, req: Request) {
    const contactId = this.assertClient(user);
    if (!acknowledge) {
      throw new BadRequestException('Vous devez confirmer la signature électronique');
    }
    return this.contracts.signByContact(id, contactId, user.organizationId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}