import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AuthUser } from '@crm/shared';

export interface SearchResults {
  contacts: unknown[];
  accounts: unknown[];
  deals: unknown[];
  projects: unknown[];
  tasks: unknown[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(query: string, user: AuthUser): Promise<SearchResults> {
    if (!query || query.trim().length < 2) {
      return { contacts: [], accounts: [], deals: [], projects: [], tasks: [] };
    }

    const q = query.trim();
    const orgId = user.organizationId;
    const ilike = (_field: string) => ({ contains: q, mode: 'insensitive' as const });

    const [contacts, accounts, deals, projects, tasks] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { firstName: ilike('firstName') },
            { lastName: ilike('lastName') },
            { email: ilike('email') },
            { jobTitle: ilike('jobTitle') },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
      }),

      this.prisma.account.findMany({
        where: {
          organizationId: orgId,
          OR: [{ name: ilike('name') }, { industry: ilike('industry') }],
        },
        take: 5,
        select: { id: true, name: true, industry: true },
      }),

      this.prisma.deal.findMany({
        where: { organizationId: orgId, title: ilike('title') },
        take: 5,
        select: { id: true, title: true, stage: true, value: true },
      }),

      this.prisma.project.findMany({
        where: { organizationId: orgId, name: ilike('name') },
        take: 5,
        select: { id: true, name: true, status: true },
      }),

      this.prisma.task.findMany({
        where: { organizationId: orgId, title: ilike('title') },
        take: 5,
        select: { id: true, title: true, status: true, priority: true },
      }),
    ]);

    return { contacts, accounts, deals, projects, tasks };
  }
}
