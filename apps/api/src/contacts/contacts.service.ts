import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser } from '@crm/shared';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto, user: AuthUser) {
    return this.prisma.contact.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
      },
      include: { account: true },
    });
  }

  async findAll(pagination: PaginationDto, user: AuthUser) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { jobTitle: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { account: { select: { id: true, name: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        account: true,
        deals: { orderBy: { createdAt: 'desc' }, take: 5 },
        interactions: { orderBy: { occurredAt: 'desc' }, take: 10 },
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!contact) throw new NotFoundException('Contact introuvable');
    return contact;
  }

  async update(id: string, dto: Partial<CreateContactDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.contact.update({
      where: { id },
      data: dto,
      include: { account: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.contact.delete({ where: { id } });
    return { message: 'Contact supprimé' };
  }
}
