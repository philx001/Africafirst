import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';
import { OrganizationsService } from './organizations.service';

type ExportFrequency = 'daily' | 'weekly';

@Injectable()
export class OrganizationsExportsScheduler {
  private readonly logger = new Logger(OrganizationsExportsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  private shouldRun(
    scheduled: Record<string, unknown>,
    now: Date,
  ): boolean {
    const enabled = scheduled.enabled === true;
    if (!enabled) return false;

    const hourRaw = Number(scheduled.atHourUtc ?? 2);
    const atHourUtc = Number.isFinite(hourRaw) ? Math.max(0, Math.min(23, Math.trunc(hourRaw))) : 2;
    if (now.getUTCHours() !== atHourUtc) return false;

    const frequency: ExportFrequency = scheduled.frequency === 'weekly' ? 'weekly' : 'daily';
    const lastRunAtRaw = typeof scheduled.lastRunAt === 'string' ? scheduled.lastRunAt : null;
    const lastRunAt = lastRunAtRaw ? new Date(lastRunAtRaw) : null;

    if (lastRunAt && !Number.isNaN(lastRunAt.getTime())) {
      const sameUtcDay =
        lastRunAt.getUTCFullYear() === now.getUTCFullYear() &&
        lastRunAt.getUTCMonth() === now.getUTCMonth() &&
        lastRunAt.getUTCDate() === now.getUTCDate();
      if (sameUtcDay) return false;
    }

    if (frequency === 'weekly') {
      const weekdayRaw = Number(scheduled.weekdayUtc ?? 1);
      const weekdayUtc = Number.isFinite(weekdayRaw)
        ? Math.max(0, Math.min(6, Math.trunc(weekdayRaw)))
        : 1;
      if (now.getUTCDay() !== weekdayUtc) return false;
    }

    return true;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    const now = new Date();
    const organizations = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of organizations) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const scheduled = (settings.scheduledExports as Record<string, unknown>) || {};
      if (!this.shouldRun(scheduled, now)) continue;
      try {
        await this.organizations.runScheduledExportsForOrganization(org.id, undefined, undefined, 'scheduler');
      } catch (error) {
        this.logger.warn(
          `Scheduled exports failed for org ${org.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }
}
