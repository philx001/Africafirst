import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../config/prisma.service';
import { WebhooksService } from '../../webhooks/webhooks.service';
import { AutomationsService } from '../automations.service';

interface AutomationJob {
  ruleId: string;
  organizationId: string;
  payload: unknown;
}

@Processor('automations')
export class AutomationWorker {
  private readonly logger = new Logger(AutomationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
    private readonly automations: AutomationsService,
  ) {}

  @Process('execute')
  async handleAutomation(job: Job<AutomationJob>) {
    const { ruleId, organizationId, payload } = job.data;
    this.logger.log(`[Worker] Exécution règle ${ruleId}`);

    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.isEnabled) {
      this.logger.warn(`[Worker] Règle ${ruleId} inactive ou introuvable`);
      return;
    }

    const actions = rule.actions as Array<{ type: string; url?: string; secret?: string; [k: string]: unknown }>;

    for (const action of actions) {
      if (action.type === 'send_webhook' && action.url) {
        await this.webhooks.dispatch({
          url: action.url as string,
          payload: { event: rule.trigger, data: payload, organizationId },
          secret: action.secret as string | undefined,
        });
      }
    }

    await this.automations.executeRule(rule, payload, organizationId);
  }
}
