import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentsService } from '../documents/documents.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser, TicketStatus } from '@crm/shared';
import {
  computeTicketFirstResponseSlaDueAt,
  computeTicketResolutionSlaDueAt,
} from './ticket-sla.helper';
import { extractMentionEmails } from './ticket-mention.helper';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const TICKET_STATUS_LIST: TicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export class CreateTicketDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: PRIORITIES }) @IsOptional() @IsEnum(PRIORITIES) priority?: (typeof PRIORITIES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: PRIORITIES }) @IsOptional() @IsEnum(PRIORITIES) priority?: (typeof PRIORITIES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: TICKET_STATUS_LIST })
  @IsOptional()
  @IsIn(TICKET_STATUS_LIST)
  status?: TicketStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
}

export class CreateClientTicketDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}

export class AddTicketCommentDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(12000) body: string;
}

const ticketInclude = {
  contact: { select: { id: true, firstName: true, lastName: true, email: true } },
  project: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.TicketInclude;

const ticketDetailInclude = {
  contact: ticketInclude.contact,
  project: ticketInclude.project,
  account: ticketInclude.account,
  assignee: ticketInclude.assignee,
  createdBy: ticketInclude.createdBy,
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
      ticketId: true,
    },
  },
} satisfies Prisma.TicketInclude;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly documents: DocumentsService,
  ) {}

  private async nextTicketNumber(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<number> {
    const last = await tx.ticket.findFirst({
      where: { organizationId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    return (last?.ticketNumber ?? 0) + 1;
  }

  private async validateInternalLinks(
    organizationId: string,
    links: {
      contactId?: string | null;
      projectId?: string | null;
      accountId?: string | null;
      assigneeId?: string | null;
    },
  ) {
    if (links.assigneeId) {
      const u = await this.prisma.user.findFirst({
        where: { id: links.assigneeId, organizationId, role: { not: 'client' } },
        select: { id: true },
      });
      if (!u) throw new BadRequestException('Assigné invalide');
    }
    if (links.contactId) {
      const c = await this.prisma.contact.findFirst({
        where: { id: links.contactId, organizationId },
        select: { id: true },
      });
      if (!c) throw new BadRequestException('Contact invalide');
    }
    if (links.accountId) {
      const a = await this.prisma.account.findFirst({
        where: { id: links.accountId, organizationId },
        select: { id: true },
      });
      if (!a) throw new BadRequestException('Entreprise invalide');
    }
    if (links.projectId) {
      const p = await this.prisma.project.findFirst({
        where: { id: links.projectId, organizationId },
        select: { id: true, contactId: true },
      });
      if (!p) throw new BadRequestException('Projet invalide');
      if (links.contactId && p.contactId && p.contactId !== links.contactId) {
        throw new BadRequestException('Le projet ne correspond pas au contact');
      }
    }
  }

  private statusSideEffects(status: TicketStatus | undefined, prev: TicketStatus): {
    resolvedAt?: Date | null;
    closedAt?: Date | null;
  } {
    if (!status || status === prev) return {};
    const now = new Date();
    const patch: { resolvedAt?: Date | null; closedAt?: Date | null } = {};
    if (status === 'resolved') {
      patch.resolvedAt = now;
    }
    if (status === 'closed') {
      patch.closedAt = now;
      if (prev !== 'resolved') patch.resolvedAt = patch.resolvedAt ?? now;
    }
    if (status === 'open' || status === 'in_progress') {
      patch.resolvedAt = null;
      patch.closedAt = null;
    }
    return patch;
  }

  private async notifyInternalTeamNewTicket(organizationId: string, ticketId: string, title: string) {
    const team = await this.prisma.user.findMany({
      where: { organizationId, role: { in: ['admin', 'member'] }, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      team.map((u) =>
        this.notifications.create({
          userId: u.id,
          organizationId,
          type: 'ticket_created',
          title: 'Nouveau ticket',
          body: title.slice(0, 200),
          payload: { ticketId },
        }),
      ),
    );
  }

  private async notifyInternalTeamTicketComment(
    organizationId: string,
    ticketId: string,
    title: string,
    commentBody: string,
  ) {
    const team = await this.prisma.user.findMany({
      where: { organizationId, role: { in: ['admin', 'member'] }, isActive: true },
      select: { id: true },
    });
    const preview = `${title.slice(0, 80)} — ${commentBody.trim().slice(0, 120)}`;
    await Promise.all(
      team.map((u) =>
        this.notifications.create({
          userId: u.id,
          organizationId,
          type: 'ticket_comment',
          title: 'Message client sur ticket',
          body: preview.slice(0, 200),
          payload: { ticketId },
        }),
      ),
    );
  }

  private async notifyClientTicketReply(
    organizationId: string,
    ticket: { id: string; title: string; contactId: string | null },
  ) {
    if (!ticket.contactId) return;
    const clientUser = await this.prisma.user.findFirst({
      where: { organizationId, role: 'client', contactId: ticket.contactId, isActive: true },
      select: { id: true },
    });
    if (!clientUser) return;
    await this.notifications.create({
      userId: clientUser.id,
      organizationId,
      type: 'ticket_comment',
      title: 'Réponse sur votre ticket',
      body: ticket.title.slice(0, 200),
      payload: { ticketId: ticket.id },
    });
  }

  /** Mentions `@email` réservées aux auteurs internes — notif `mention`, sans doublon par destinataire. */
  private async notifyTicketCommentMentions(
    organizationId: string,
    ticketId: string,
    ticketTitle: string,
    body: string,
    authorId: string,
    commentId: string,
  ) {
    const emails = extractMentionEmails(body);
    if (emails.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['admin', 'member'] },
        isActive: true,
        id: { not: authorId },
        OR: emails.map((email) => ({
          email: { equals: email, mode: 'insensitive' as const },
        })),
      },
      select: { id: true },
    });

    const preview = `Mention — ${ticketTitle.slice(0, 120)}`.slice(0, 200);
    await Promise.all(
      users.map((u) =>
        this.notifications.create({
          userId: u.id,
          organizationId,
          type: 'mention',
          title: 'Mention sur un ticket',
          body: preview,
          payload: { ticketId, commentId },
        }),
      ),
    );
  }

  private async notifyAssignee(
    organizationId: string,
    assigneeId: string,
    ticketId: string,
    title: string,
    actorId: string,
  ) {
    if (assigneeId === actorId) return;
    await this.notifications.create({
      userId: assigneeId,
      organizationId,
      type: 'ticket_assigned',
      title: 'Ticket assigné',
      body: title.slice(0, 200),
      payload: { ticketId },
    });
  }

  async create(dto: CreateTicketDto, user: AuthUser) {
    await this.validateInternalLinks(user.organizationId, {
      contactId: dto.contactId,
      projectId: dto.projectId,
      accountId: dto.accountId,
      assigneeId: dto.assigneeId,
    });

    const ticket = await this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.nextTicketNumber(tx, user.organizationId);
      const priority = (dto.priority ?? 'medium') as Priority;
      const orgRow = await tx.organization.findUnique({
        where: { id: user.organizationId },
        select: { settings: true },
      });
      const anchor = new Date();
      const slaDueAt = computeTicketFirstResponseSlaDueAt(anchor, priority, orgRow?.settings);
      const resolutionSlaDueAt = computeTicketResolutionSlaDueAt(anchor, priority, orgRow?.settings);
      return tx.ticket.create({
        data: {
          ticketNumber,
          title: dto.title,
          description: dto.description,
          priority,
          category: dto.category ?? 'support',
          organizationId: user.organizationId,
          contactId: dto.contactId,
          projectId: dto.projectId,
          accountId: dto.accountId,
          assigneeId: dto.assigneeId,
          createdById: user.id,
          slaDueAt,
          resolutionSlaDueAt,
        },
        include: ticketInclude,
      });
    });

    if (ticket.assigneeId) {
      await this.notifyAssignee(
        user.organizationId,
        ticket.assigneeId,
        ticket.id,
        ticket.title,
        user.id,
      );
    }

    return ticket;
  }

  /** Création depuis le portail client (contact + projet du client uniquement). */
  async createFromPortal(dto: CreateClientTicketDto, user: AuthUser) {
    if (user.role !== 'client' || !user.contactId) {
      throw new ForbiddenException('Accès réservé aux clients');
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.projectId,
          organizationId: user.organizationId,
          contactId: user.contactId,
        },
        select: { id: true },
      });
      if (!project) throw new BadRequestException('Projet invalide ou non accessible');
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.nextTicketNumber(tx, user.organizationId);
      const orgRow = await tx.organization.findUnique({
        where: { id: user.organizationId },
        select: { settings: true },
      });
      const anchor = new Date();
      const slaDueAt = computeTicketFirstResponseSlaDueAt(anchor, Priority.medium, orgRow?.settings);
      const resolutionSlaDueAt = computeTicketResolutionSlaDueAt(
        anchor,
        Priority.medium,
        orgRow?.settings,
      );
      return tx.ticket.create({
        data: {
          ticketNumber,
          title: dto.title,
          description: dto.description,
          priority: Priority.medium,
          category: 'support',
          organizationId: user.organizationId,
          contactId: user.contactId,
          projectId: dto.projectId,
          createdById: user.id,
          slaDueAt,
          resolutionSlaDueAt,
        },
        include: ticketInclude,
      });
    });

    await this.notifyInternalTeamNewTicket(user.organizationId, ticket.id, ticket.title);

    return ticket;
  }

  async findAll(
    pagination: PaginationDto,
    user: AuthUser,
    filters?: {
      status?: TicketStatus;
      projectId?: string;
      contactId?: string;
      accountId?: string;
      assigneeId?: string;
    },
  ) {
    const { page = 1, limit = 50, search } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {
      organizationId: user.organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.contactId && { contactId: filters.contactId }),
      ...(filters?.accountId && { accountId: filters.accountId }),
      ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: ticketInclude,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForPortal(user: AuthUser) {
    if (user.role !== 'client' || !user.contactId) {
      throw new ForbiddenException('Accès réservé aux clients');
    }

    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        contactId: user.contactId,
      },
      orderBy: { createdAt: 'desc' },
      include: ticketInclude,
    });
  }

  async findOne(id: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId: user.organizationId },
      include: ticketDetailInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    if (user.role === 'client') {
      if (!user.contactId || ticket.contactId !== user.contactId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser) {
    const existing = await this.prisma.ticket.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Ticket introuvable');

    if (user.role === 'client') {
      throw new ForbiddenException('Modification réservée à l’équipe');
    }

    const nextContact = dto.contactId !== undefined ? dto.contactId : existing.contactId;
    const nextProject = dto.projectId !== undefined ? dto.projectId : existing.projectId;
    const nextAccount = dto.accountId !== undefined ? dto.accountId : existing.accountId;
    const nextAssignee =
      dto.assigneeId !== undefined ? dto.assigneeId : existing.assigneeId;

    await this.validateInternalLinks(user.organizationId, {
      contactId: nextContact,
      projectId: nextProject,
      accountId: nextAccount,
      assigneeId: nextAssignee,
    });

    const orgRow = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });

    const slaPatch =
      dto.priority !== undefined && dto.priority !== existing.priority
        ? {
            slaDueAt: computeTicketFirstResponseSlaDueAt(
              existing.createdAt,
              dto.priority as Priority,
              orgRow?.settings,
            ),
            resolutionSlaDueAt: computeTicketResolutionSlaDueAt(
              existing.createdAt,
              dto.priority as Priority,
              orgRow?.settings,
            ),
          }
        : {};

    const side = this.statusSideEffects(dto.status, existing.status);

    const { status, ...rest } = dto;
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...rest,
        ...(status !== undefined ? { status } : {}),
        ...slaPatch,
        ...side,
      },
      include: ticketInclude,
    });

    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.notifyAssignee(
        user.organizationId,
        dto.assigneeId,
        ticket.id,
        ticket.title,
        user.id,
      );
    }

    return ticket;
  }

  async addComment(ticketId: string, dto: AddTicketCommentDto, user: AuthUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, organizationId: user.organizationId },
      select: {
        id: true,
        title: true,
        contactId: true,
        firstResponseAt: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    if (user.role === 'client') {
      if (!user.contactId || ticket.contactId !== user.contactId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const trimmed = dto.body.trim();

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketComment.create({
        data: {
          body: trimmed,
          organizationId: user.organizationId,
          ticketId,
          authorId: user.id,
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      });

      const isInternal = user.role === 'admin' || user.role === 'member';
      if (isInternal && !ticket.firstResponseAt) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() },
        });
      }

      return created;
    });

    if (user.role === 'client') {
      await this.notifyInternalTeamTicketComment(
        user.organizationId,
        ticket.id,
        ticket.title,
        trimmed,
      );
    } else if (ticket.contactId) {
      await this.notifyClientTicketReply(user.organizationId, ticket);
    }

    if (user.role === 'admin' || user.role === 'member') {
      await this.notifyTicketCommentMentions(
        user.organizationId,
        ticket.id,
        ticket.title,
        trimmed,
        user.id,
        comment.id,
      );
    }

    return comment;
  }

  async uploadAttachment(ticketId: string, file: Express.Multer.File | undefined, user: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException('Fichier requis');

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, organizationId: user.organizationId },
      select: { id: true, contactId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (user.role === 'client') {
      if (!user.contactId || ticket.contactId !== user.contactId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    return this.documents.upload(
      {
        file,
        organizationId: user.organizationId,
        ticketId,
      },
      user,
    );
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.prisma.ticket.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Ticket introuvable');

    await this.prisma.ticket.delete({ where: { id } });
    return { ok: true };
  }
}
