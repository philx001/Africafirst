import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { AuthUser } from '@crm/shared';
import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiPropertyOptional() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() employeeCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto, user: AuthUser) {
    return this.prisma.account.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }

  async findAll(pagination: PaginationDto, user: AuthUser) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { industry: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { contacts: true, deals: true } },
        },
      }),
      this.prisma.account.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const account = await this.prisma.account.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        contacts: { orderBy: { createdAt: 'desc' }, take: 20 },
        deals: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { contacts: true, deals: true, documents: true } },
      },
    });

    if (!account) throw new NotFoundException('Entreprise introuvable');
    return account;
  }

  async update(id: string, dto: Partial<CreateAccountDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.account.delete({ where: { id } });
    return { message: 'Entreprise supprimée' };
  }
}
