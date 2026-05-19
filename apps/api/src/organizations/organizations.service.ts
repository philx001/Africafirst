import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AuthUser } from '@crm/shared';
import { toCsv } from '../common/utils/csv';
import { SupabaseService } from '../config/supabase.service';

function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : '';
}

function joinTags(tags: string[]): string {
  return tags.join('; ');
}

/** Étapes du pipeline (aligné sur schema DealStage). */
const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const ISO_DATE_ONLY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const SCHEDULED_EXPORT_PREFIX = 'scheduled_export:';
const SCHEDULED_EXPORT_TYPES = ['deals', 'contacts', 'projects', 'tickets'] as const;
type ScheduledExportType = (typeof SCHEDULED_EXPORT_TYPES)[number];
type ExportDateRange = { from: string; to: string; start: Date; end: Date };

/** Jours inclus entre deux dates en UTC (date seule). */
function inclusiveUtcDaySpan(start: Date, end: Date): number {
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((b - a) / 86_400_000) + 1;
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Lundi UTC (ISO semaine simplifiée) du jour contenant `d`. */
function startOfIsoWeekUtc(d: Date): Date {
  const day = utcMidnight(d);
  const wd = day.getUTCDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + diff));
}

function addUtcDays(midnightUtc: Date, n: number): Date {
  return new Date(
    Date.UTC(midnightUtc.getUTCFullYear(), midnightUtc.getUTCMonth(), midnightUtc.getUTCDate() + n),
  );
}

function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type DealActivityGranularity = 'day' | 'week';
type StatsDrilldownMetric =
  | 'totalContacts'
  | 'pipelineDeals'
  | 'conversionRate'
  | 'totalProjects'
  | 'activeTasks'
  | 'totalRevenue'
  | 'ticketsActive';
type TicketActivityKind = 'created' | 'resolved' | 'closed';

function bucketKeyForUtcInstant(ts: Date, g: DealActivityGranularity): string {
  if (g === 'day') {
    return ts.toISOString().slice(0, 10);
  }
  return isoDateUtc(startOfIsoWeekUtc(ts));
}

function buildOrderedBucketKeys(start: Date, end: Date, g: DealActivityGranularity): string[] {
  const keys: string[] = [];
  if (g === 'day') {
    let cur = utcMidnight(start);
    const last = utcMidnight(end);
    while (cur.getTime() <= last.getTime()) {
      keys.push(isoDateUtc(cur));
      cur = addUtcDays(cur, 1);
    }
    return keys;
  }
  let cur = startOfIsoWeekUtc(start);
  const last = utcMidnight(end);
  while (cur.getTime() <= last.getTime()) {
    keys.push(isoDateUtc(cur));
    cur = addUtcDays(cur, 7);
  }
  return keys;
}

export interface DealActivitySeriesBucket {
  periodStart: string;
  dealsCreated: number;
  dealsWonClosed: number;
  dealsLostClosed: number;
  revenueWonClosed: number;
}

export interface DealActivitySeriesPayload {
  granularity: DealActivityGranularity;
  buckets: DealActivitySeriesBucket[];
}

export interface TicketActivitySeriesBucket {
  periodStart: string;
  created: number;
  resolved: number;
  closed: number;
}

export interface TicketActivitySeriesPayload {
  granularity: DealActivityGranularity;
  buckets: TicketActivitySeriesBucket[];
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  private normalizeScheduledExportTypes(raw?: unknown): ScheduledExportType[] {
    if (!Array.isArray(raw)) return [...SCHEDULED_EXPORT_TYPES];
    const arr = raw
      .filter((v): v is ScheduledExportType => typeof v === 'string' && SCHEDULED_EXPORT_TYPES.includes(v as ScheduledExportType));
    return arr.length > 0 ? arr : [...SCHEDULED_EXPORT_TYPES];
  }

  private parseScheduledExportMeta(
    description: string | null,
  ): { dataset: ScheduledExportType; runAt?: string; from?: string; to?: string } | null {
    if (!description || !description.startsWith(SCHEDULED_EXPORT_PREFIX)) return null;
    const parts = description.split(':');
    if (parts.length < 2) return null;
    const dataset = parts[1];
    if (!dataset || !SCHEDULED_EXPORT_TYPES.includes(dataset as ScheduledExportType)) return null;
    const runAt = parts[2];
    const from = parts[3];
    const to = parts[4];
    return {
      dataset: dataset as ScheduledExportType,
      ...(runAt ? { runAt } : {}),
      ...(from && ISO_DATE_ONLY.test(from) ? { from } : {}),
      ...(to && ISO_DATE_ONLY.test(to) ? { to } : {}),
    };
  }

  private resolveRollingRange(daysRaw: unknown, now: Date): ExportDateRange | null {
    const days = Number(daysRaw);
    if (!Number.isFinite(days) || days < 1) return null;
    const dayCount = Math.min(3650, Math.trunc(days));
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    const start = new Date(end.getTime() - (dayCount - 1) * 86_400_000);
    start.setUTCHours(0, 0, 0, 0);
    return {
      from: isoDateUtc(start),
      to: isoDateUtc(end),
      start,
      end,
    };
  }

  private resolveScheduledRange(
    scheduled: Record<string, unknown>,
    explicit?: { from?: string; to?: string },
  ): ExportDateRange | null {
    const from = explicit?.from?.trim() || (typeof scheduled.from === 'string' ? scheduled.from.trim() : '');
    const to = explicit?.to?.trim() || (typeof scheduled.to === 'string' ? scheduled.to.trim() : '');
    if (from || to) {
      const r = OrganizationsService.resolveStatsRange(from || undefined, to || undefined);
      if (!r) return null;
      return { from: r.from, to: r.to, start: r.start, end: r.end };
    }
    return this.resolveRollingRange(scheduled.periodDays, new Date());
  }

  private async exportCsvByType(
    organizationId: string,
    type: ScheduledExportType,
    range?: ExportDateRange | null,
  ): Promise<string> {
    switch (type) {
      case 'deals':
        return this.exportDealsCsvByOrgId(organizationId, range);
      case 'contacts':
        return this.exportContactsCsvByOrgId(organizationId, range);
      case 'projects':
        return this.exportProjectsCsvByOrgId(organizationId, range);
      case 'tickets':
        return this.exportTicketsCsvByOrgId(organizationId, range);
      default:
        return '';
    }
  }

  /** `from` / `to` : YYYY-MM-DD (UTC boundaries). Les deux ensemble ou aucun. */
  private static resolveStatsRange(
    fromRaw?: string,
    toRaw?: string,
  ): { start: Date; end: Date; from: string; to: string } | null {
    const from = fromRaw?.trim();
    const to = toRaw?.trim();
    if (!from && !to) return null;
    if (!from || !to) {
      throw new BadRequestException(
        'Les paramètres de requête from et to doivent être fournis ensemble (format YYYY-MM-DD).',
      );
    }
    if (!ISO_DATE_ONLY.test(from) || !ISO_DATE_ONLY.test(to)) {
      throw new BadRequestException('from et to attendus au format YYYY-MM-DD.');
    }
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('from doit précéder ou égaler to.');
    }
    return { start, end, from, to };
  }

  private static resolveTicketBucketRange(
    periodStartRaw: string,
    granularityRaw: string,
  ): { start: Date; end: Date; periodStart: string; granularity: DealActivityGranularity } {
    const periodStart = periodStartRaw.trim();
    if (!ISO_DATE_ONLY.test(periodStart)) {
      throw new BadRequestException('periodStart attendu au format YYYY-MM-DD.');
    }
    const granularity: DealActivityGranularity = granularityRaw === 'week' ? 'week' : 'day';
    const start = new Date(`${periodStart}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('periodStart invalide.');
    }
    const end =
      granularity === 'day'
        ? new Date(`${periodStart}T23:59:59.999Z`)
        : new Date(start.getTime() + 7 * 86_400_000 - 1);
    return { start, end, periodStart, granularity };
  }

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

  async getStats(user: AuthUser, query?: { from?: string; to?: string }) {
    const orgId = user.organizationId;
    const range = OrganizationsService.resolveStatsRange(query?.from, query?.to);

    if (!range) {
      const [
        totalContacts,
        totalDeals,
        wonDeals,
        pipelineDeals,
        ticketsOpen,
        ticketsInProgress,
        totalProjects,
        activeTasks,
        revenueAgg,
      ] = await this.prisma.$transaction([
        this.prisma.contact.count({ where: { organizationId: orgId } }),
        this.prisma.deal.count({ where: { organizationId: orgId } }),
        this.prisma.deal.count({ where: { organizationId: orgId, stage: 'won' } }),
        this.prisma.deal.count({
          where: { organizationId: orgId, stage: { notIn: ['won', 'lost'] } },
        }),
        this.prisma.ticket.count({ where: { organizationId: orgId, status: 'open' } }),
        this.prisma.ticket.count({
          where: { organizationId: orgId, status: 'in_progress' },
        }),
        this.prisma.project.count({ where: { organizationId: orgId } }),
        this.prisma.task.count({
          where: { organizationId: orgId, status: { not: 'done' } },
        }),
        this.prisma.deal.aggregate({
          where: { organizationId: orgId, stage: 'won' },
          _sum: { value: true },
        }),
      ]);

      const stageCounts = await Promise.all(
        DEAL_STAGES.map((stage) =>
          this.prisma.deal.count({ where: { organizationId: orgId, stage } }),
        ),
      );

      const dealStages = Object.fromEntries(DEAL_STAGES.map((s, i) => [s, stageCounts[i]]));

      return {
        totalContacts,
        totalDeals,
        pipelineDeals,
        wonDeals,
        conversionRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
        dealStages,
        totalProjects,
        activeTasks,
        totalRevenue: Number(revenueAgg._sum.value ?? 0),
        ticketsOpen,
        ticketsInProgress,
        ticketsActive: ticketsOpen + ticketsInProgress,
        period: null as { from: string; to: string } | null,
        dealActivitySeries: null as DealActivitySeriesPayload | null,
        ticketActivitySeries: null as TicketActivitySeriesPayload | null,
      };
    }

    const { start, end, from, to } = range;

    const dealsCreatedWhere = {
      organizationId: orgId,
      createdAt: { gte: start, lte: end },
    };

    const [
      totalContacts,
      totalDeals,
      pipelineDeals,
      dealsClosedWon,
      dealsClosedLost,
      ticketsOpen,
      ticketsInProgress,
      totalProjects,
      activeTasks,
      revenueAgg,
    ] = await this.prisma.$transaction([
      this.prisma.contact.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.deal.count({ where: dealsCreatedWhere }),
      this.prisma.deal.count({
        where: {
          ...dealsCreatedWhere,
          stage: { notIn: ['won', 'lost'] },
        },
      }),
      this.prisma.deal.count({
        where: {
          organizationId: orgId,
          stage: 'won',
          closedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.deal.count({
        where: {
          organizationId: orgId,
          stage: 'lost',
          closedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.ticket.count({
        where: {
          organizationId: orgId,
          status: 'open',
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.ticket.count({
        where: {
          organizationId: orgId,
          status: 'in_progress',
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.project.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          status: { not: 'done' },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.deal.aggregate({
        where: {
          organizationId: orgId,
          stage: 'won',
          closedAt: { gte: start, lte: end },
        },
        _sum: { value: true },
      }),
    ]);

    const stageCounts = await Promise.all(
      DEAL_STAGES.map((stage) =>
        this.prisma.deal.count({
          where: { ...dealsCreatedWhere, stage },
        }),
      ),
    );

    const dealStages = Object.fromEntries(DEAL_STAGES.map((s, i) => [s, stageCounts[i]]));

    const closedTotal = dealsClosedWon + dealsClosedLost;

    const dealActivitySeries = await this.computeDealActivitySeries(orgId, start, end);
    const ticketActivitySeries = await this.computeTicketActivitySeries(orgId, start, end);

    return {
      totalContacts,
      totalDeals,
      pipelineDeals,
      wonDeals: dealsClosedWon,
      conversionRate: closedTotal > 0 ? Math.round((dealsClosedWon / closedTotal) * 100) : 0,
      dealStages,
      totalProjects,
      activeTasks,
      totalRevenue: Number(revenueAgg._sum.value ?? 0),
      ticketsOpen,
      ticketsInProgress,
      ticketsActive: ticketsOpen + ticketsInProgress,
      period: { from, to },
      dealActivitySeries,
      ticketActivitySeries,
    };
  }

  async getStatsDrilldown(
    user: AuthUser,
    metric: StatsDrilldownMetric,
    query?: { from?: string; to?: string; limit?: number },
  ) {
    const orgId = user.organizationId;
    const range = OrganizationsService.resolveStatsRange(query?.from, query?.to);
    const take = Math.max(1, Math.min(100, Number(query?.limit ?? 20)));

    switch (metric) {
      case 'totalContacts': {
        const items = await this.prisma.contact.findMany({
          where: {
            organizationId: orgId,
            ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'pipelineDeals': {
        const items = await this.prisma.deal.findMany({
          where: {
            organizationId: orgId,
            stage: { notIn: ['won', 'lost'] },
            ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            title: true,
            stage: true,
            value: true,
            currency: true,
            createdAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'conversionRate': {
        const items = await this.prisma.deal.findMany({
          where: {
            organizationId: orgId,
            stage: { in: ['won', 'lost'] },
            ...(range ? { closedAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { closedAt: 'desc' },
          take,
          select: {
            id: true,
            title: true,
            stage: true,
            closedAt: true,
            value: true,
            currency: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'totalProjects': {
        const items = await this.prisma.project.findMany({
          where: {
            organizationId: orgId,
            ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            name: true,
            status: true,
            progress: true,
            createdAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'activeTasks': {
        const items = await this.prisma.task.findMany({
          where: {
            organizationId: orgId,
            status: { not: 'done' },
            ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            createdAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'totalRevenue': {
        const items = await this.prisma.deal.findMany({
          where: {
            organizationId: orgId,
            stage: 'won',
            ...(range ? { closedAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { closedAt: 'desc' },
          take,
          select: {
            id: true,
            title: true,
            value: true,
            currency: true,
            closedAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      case 'ticketsActive': {
        const items = await this.prisma.ticket.findMany({
          where: {
            organizationId: orgId,
            status: { in: ['open', 'in_progress'] },
            ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        });
        return { metric, period: range ? { from: range.from, to: range.to } : null, items };
      }
      default:
        throw new BadRequestException('Metric de drill-down non supportee.');
    }
  }

  async getTicketActivityDrilldown(
    user: AuthUser,
    query: {
      periodStart: string;
      granularity: string;
      activity: string;
      limit?: number;
    },
  ) {
    const orgId = user.organizationId;
    const activity = (query.activity || '').trim() as TicketActivityKind;
    if (!['created', 'resolved', 'closed'].includes(activity)) {
      throw new BadRequestException('activity doit être created, resolved ou closed.');
    }
    const { start, end, periodStart, granularity } = OrganizationsService.resolveTicketBucketRange(
      query.periodStart,
      query.granularity,
    );
    const take = Math.max(1, Math.min(200, Number(query.limit ?? 50)));
    const dateField =
      activity === 'created' ? 'createdAt' : activity === 'resolved' ? 'resolvedAt' : 'closedAt';

    const items = await this.prisma.ticket.findMany({
      where: {
        organizationId: orgId,
        [dateField]: { gte: start, lte: end },
      },
      orderBy: [{ [dateField]: 'desc' as const }],
      take,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
      },
    });

    return {
      period: {
        from: isoDateUtc(start),
        to: isoDateUtc(end),
      },
      bucket: { periodStart, granularity, activity },
      items,
    };
  }

  /** Activité pipeline : créations et clôtures par jour (≤ 92 j) ou par semaine ISO UTC. */
  private async computeDealActivitySeries(
    organizationId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<DealActivitySeriesPayload> {
    const daySpan = inclusiveUtcDaySpan(rangeStart, rangeEnd);
    const granularity: DealActivityGranularity = daySpan <= 92 ? 'day' : 'week';
    const orderedKeys = buildOrderedBucketKeys(rangeStart, rangeEnd, granularity);

    const emptyCell = (): Omit<DealActivitySeriesBucket, 'periodStart'> => ({
      dealsCreated: 0,
      dealsWonClosed: 0,
      dealsLostClosed: 0,
      revenueWonClosed: 0,
    });
    const acc = new Map<string, ReturnType<typeof emptyCell>>();
    for (const k of orderedKeys) acc.set(k, emptyCell());

    const [createdRows, wonRows, lostRows] = await Promise.all([
      this.prisma.deal.findMany({
        where: { organizationId, createdAt: { gte: rangeStart, lte: rangeEnd } },
        select: { createdAt: true },
      }),
      this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: 'won',
          closedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { closedAt: true, value: true },
      }),
      this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: 'lost',
          closedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { closedAt: true },
      }),
    ]);

    for (const row of createdRows) {
      const k = bucketKeyForUtcInstant(row.createdAt, granularity);
      const cell = acc.get(k);
      if (cell) cell.dealsCreated += 1;
    }
    for (const row of wonRows) {
      if (!row.closedAt) continue;
      const k = bucketKeyForUtcInstant(row.closedAt, granularity);
      const cell = acc.get(k);
      if (cell) {
        cell.dealsWonClosed += 1;
        cell.revenueWonClosed += Number(row.value ?? 0);
      }
    }
    for (const row of lostRows) {
      if (!row.closedAt) continue;
      const k = bucketKeyForUtcInstant(row.closedAt, granularity);
      const cell = acc.get(k);
      if (cell) cell.dealsLostClosed += 1;
    }

    return {
      granularity,
      buckets: orderedKeys.map((periodStart) => ({
        periodStart,
        ...(acc.get(periodStart) ?? emptyCell()),
      })),
    };
  }

  private async computeTicketActivitySeries(
    organizationId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<TicketActivitySeriesPayload> {
    const daySpan = inclusiveUtcDaySpan(rangeStart, rangeEnd);
    const granularity: DealActivityGranularity = daySpan <= 92 ? 'day' : 'week';
    const orderedKeys = buildOrderedBucketKeys(rangeStart, rangeEnd, granularity);

    const emptyCell = (): Omit<TicketActivitySeriesBucket, 'periodStart'> => ({
      created: 0,
      resolved: 0,
      closed: 0,
    });
    const acc = new Map<string, ReturnType<typeof emptyCell>>();
    for (const k of orderedKeys) acc.set(k, emptyCell());

    const [createdRows, resolvedRows, closedRows] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { organizationId, createdAt: { gte: rangeStart, lte: rangeEnd } },
        select: { createdAt: true },
      }),
      this.prisma.ticket.findMany({
        where: { organizationId, resolvedAt: { gte: rangeStart, lte: rangeEnd } },
        select: { resolvedAt: true },
      }),
      this.prisma.ticket.findMany({
        where: { organizationId, closedAt: { gte: rangeStart, lte: rangeEnd } },
        select: { closedAt: true },
      }),
    ]);

    for (const row of createdRows) {
      const k = bucketKeyForUtcInstant(row.createdAt, granularity);
      const cell = acc.get(k);
      if (cell) cell.created += 1;
    }
    for (const row of resolvedRows) {
      if (!row.resolvedAt) continue;
      const k = bucketKeyForUtcInstant(row.resolvedAt, granularity);
      const cell = acc.get(k);
      if (cell) cell.resolved += 1;
    }
    for (const row of closedRows) {
      if (!row.closedAt) continue;
      const k = bucketKeyForUtcInstant(row.closedAt, granularity);
      const cell = acc.get(k);
      if (cell) cell.closed += 1;
    }

    return {
      granularity,
      buckets: orderedKeys.map((periodStart) => ({
        periodStart,
        ...(acc.get(periodStart) ?? emptyCell()),
      })),
    };
  }

  async listScheduledExports(user: AuthUser, limit = 20) {
    const docs = await this.prisma.document.findMany({
      where: {
        organizationId: user.organizationId,
        description: { startsWith: SCHEDULED_EXPORT_PREFIX },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(limit, 100)),
    });

    return docs
      .map((d) => {
        const meta = this.parseScheduledExportMeta(d.description);
        if (!meta) return null;
        return {
          id: d.id,
          dataset: meta.dataset,
          filename: d.filename,
          createdAt: d.createdAt,
          size: d.size,
          runAt: meta.runAt ?? null,
          period: meta.from && meta.to ? { from: meta.from, to: meta.to } : null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
  }

  async runScheduledExportsForOrganization(
    organizationId: string,
    requestedTypes?: ScheduledExportType[],
    explicitRange?: { from?: string; to?: string },
    source: 'manual' | 'scheduler' = 'manual',
  ) {
    const now = new Date();
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    const scheduled = (settings.scheduledExports as Record<string, unknown>) || {};
    const datasets = requestedTypes?.length
      ? this.normalizeScheduledExportTypes(requestedTypes)
      : this.normalizeScheduledExportTypes(scheduled.datasets);
    const range = this.resolveScheduledRange(scheduled, explicitRange);

    const created: Array<{ dataset: ScheduledExportType; documentId: string; filename: string }> = [];
    const isoTs = now.toISOString().replace(/[:.]/g, '-');

    for (const dataset of datasets) {
      const csv = await this.exportCsvByType(organizationId, dataset, range);
      const filename = range
        ? `scheduled-${dataset}-${range.from}_to_${range.to}.csv`
        : `scheduled-${dataset}-${now.toISOString().slice(0, 10)}.csv`;
      const buffer = Buffer.from(csv, 'utf-8');
      const storagePath = `${organizationId}/scheduled-exports/${dataset}/${isoTs}-${dataset}.csv`;

      await this.supabase.uploadFile('documents', storagePath, buffer, 'text/csv; charset=utf-8');
      const doc = await this.prisma.document.create({
        data: {
          organizationId,
          filename,
          mimeType: 'text/csv',
          size: buffer.byteLength,
          storagePath,
          bucket: 'documents',
          description: range
            ? `${SCHEDULED_EXPORT_PREFIX}${dataset}:${now.toISOString()}:${range.from}:${range.to}`
            : `${SCHEDULED_EXPORT_PREFIX}${dataset}:${now.toISOString()}`,
        },
      });
      created.push({ dataset, documentId: doc.id, filename: doc.filename });
    }

    const nextSettings = {
      ...settings,
      scheduledExports: {
        ...scheduled,
        lastRunAt: now.toISOString(),
        lastRunSource: source,
        datasets,
        ...(range ? { lastRunRange: { from: range.from, to: range.to } } : {}),
      },
    };
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: nextSettings },
    });
    this.logger.log(
      `Scheduled exports (${source}) for org ${organizationId}: ${datasets.join(', ')}`,
    );

    return {
      created,
      runAt: now.toISOString(),
      source,
      ...(range ? { period: { from: range.from, to: range.to } } : {}),
    };
  }

  async runScheduledExportsNow(
    user: AuthUser,
    requestedTypes?: ScheduledExportType[],
    explicitRange?: { from?: string; to?: string },
  ) {
    return this.runScheduledExportsForOrganization(user.organizationId, requestedTypes, explicitRange, 'manual');
  }

  async exportDealsCsv(user: AuthUser): Promise<string> {
    return this.exportDealsCsvByOrgId(user.organizationId);
  }

  private async exportDealsCsvByOrgId(
    organizationId: string,
    range?: ExportDateRange | null,
  ): Promise<string> {
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        account: { select: { name: true } },
      },
    });

    const headers = [
      'id',
      'title',
      'stage',
      'value',
      'currency',
      'probability',
      'expectedCloseAt',
      'closedAt',
      'offerType',
      'tags',
      'description',
      'contactEmail',
      'contactName',
      'accountName',
      'createdAt',
      'updatedAt',
    ];

    const rows = deals.map((d) => {
      const cn = d.contact
        ? `${d.contact.firstName ?? ''} ${d.contact.lastName ?? ''}`.trim()
        : '';
      return [
        d.id,
        d.title,
        d.stage,
        d.value != null ? d.value.toString() : '',
        d.currency,
        d.probability ?? '',
        iso(d.expectedCloseAt),
        iso(d.closedAt),
        d.offerType,
        joinTags(d.tags),
        d.description ?? '',
        d.contact?.email ?? '',
        cn,
        d.account?.name ?? '',
        iso(d.createdAt),
        iso(d.updatedAt),
      ];
    });

    return toCsv(headers, rows);
  }

  async exportContactsCsv(user: AuthUser): Promise<string> {
    return this.exportContactsCsvByOrgId(user.organizationId);
  }

  private async exportContactsCsvByOrgId(
    organizationId: string,
    range?: ExportDateRange | null,
  ): Promise<string> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        account: { select: { name: true } },
      },
    });

    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'mobile',
      'jobTitle',
      'department',
      'city',
      'country',
      'accountName',
      'tags',
      'isActive',
      'notes',
      'createdAt',
      'updatedAt',
    ];

    const rows = contacts.map((c) => [
      c.id,
      c.firstName,
      c.lastName,
      c.email ?? '',
      c.phone ?? '',
      c.mobile ?? '',
      c.jobTitle ?? '',
      c.department ?? '',
      c.city ?? '',
      c.country ?? '',
      c.account?.name ?? '',
      joinTags(c.tags),
      c.isActive ? 'true' : 'false',
      c.notes ?? '',
      iso(c.createdAt),
      iso(c.updatedAt),
    ]);

    return toCsv(headers, rows);
  }

  async exportProjectsCsv(user: AuthUser): Promise<string> {
    return this.exportProjectsCsvByOrgId(user.organizationId);
  }

  private async exportProjectsCsvByOrgId(
    organizationId: string,
    range?: ExportDateRange | null,
  ): Promise<string> {
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        deal: { select: { title: true } },
        contact: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    const headers = [
      'id',
      'name',
      'status',
      'progress',
      'offerType',
      'budget',
      'startDate',
      'dueDate',
      'completedAt',
      'dealTitle',
      'contactEmail',
      'contactName',
      'tags',
      'description',
      'createdAt',
      'updatedAt',
    ];

    const rows = projects.map((p) => {
      const contactName = p.contact
        ? `${p.contact.firstName ?? ''} ${p.contact.lastName ?? ''}`.trim()
        : '';
      return [
        p.id,
        p.name,
        p.status,
        p.progress,
        p.offerType,
        p.budget != null ? p.budget.toString() : '',
        iso(p.startDate),
        iso(p.dueDate),
        iso(p.completedAt),
        p.deal?.title ?? '',
        p.contact?.email ?? '',
        contactName,
        joinTags(p.tags),
        p.description ?? '',
        iso(p.createdAt),
        iso(p.updatedAt),
      ];
    });

    return toCsv(headers, rows);
  }

  async exportTicketsCsv(user: AuthUser): Promise<string> {
    return this.exportTicketsCsvByOrgId(user.organizationId);
  }

  private async exportTicketsCsvByOrgId(
    organizationId: string,
    range?: ExportDateRange | null,
  ): Promise<string> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        organizationId,
        ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        contact: { select: { email: true } },
        account: { select: { name: true } },
        project: { select: { name: true } },
        assignee: { select: { email: true } },
        createdBy: { select: { email: true } },
      },
    });

    const headers = [
      'id',
      'ticketNumber',
      'title',
      'status',
      'priority',
      'category',
      'description',
      'contactEmail',
      'accountName',
      'projectName',
      'assigneeEmail',
      'createdByEmail',
      'slaDueAt',
      'firstResponseAt',
      'resolutionSlaDueAt',
      'resolvedAt',
      'closedAt',
      'createdAt',
      'updatedAt',
    ];

    const rows = tickets.map((t) => [
      t.id,
      t.ticketNumber,
      t.title,
      t.status,
      t.priority,
      t.category,
      t.description ?? '',
      t.contact?.email ?? '',
      t.account?.name ?? '',
      t.project?.name ?? '',
      t.assignee?.email ?? '',
      t.createdBy.email,
      iso(t.slaDueAt),
      iso(t.firstResponseAt),
      iso(t.resolutionSlaDueAt),
      iso(t.resolvedAt),
      iso(t.closedAt),
      iso(t.createdAt),
      iso(t.updatedAt),
    ]);

    return toCsv(headers, rows);
  }
}
