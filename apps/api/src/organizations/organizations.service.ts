import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AuthUser } from '@crm/shared';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(user: AuthUser) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        _count: {
          select: { users: true, contacts: true, deals: true, projects: true },
        },
      },
    });

    if (!org) throw new NotFoundException('Organisation introuvable');
    return org;
  }

  async update(user: AuthUser, data: { name?: string; settings?: object }) {
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data,
    });
  }

  async getStats(user: AuthUser) {
    const [totalContacts, totalDeals, wonDeals, totalProjects, activeTasks, totalRevenue] =
      await this.prisma.$transaction([
        this.prisma.contact.count({ where: { organizationId: user.organizationId } }),
        this.prisma.deal.count({ where: { organizationId: user.organizationId } }),
        this.prisma.deal.count({ where: { organizationId: user.organizationId, stage: 'won' } }),
        this.prisma.project.count({ where: { organizationId: user.organizationId } }),
        this.prisma.task.count({
          where: { organizationId: user.organizationId, status: { not: 'done' } },
        }),
        this.prisma.deal.aggregate({
          where: { organizationId: user.organizationId, stage: 'won' },
          _sum: { value: true },
        }),
      ]);

    return {
      totalContacts,
      totalDeals,
      wonDeals,
      conversionRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
      totalProjects,
      activeTasks,
      totalRevenue: totalRevenue._sum.value || 0,
    };
  }
}
