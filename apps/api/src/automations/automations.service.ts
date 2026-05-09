import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../config/prisma.service';
import { AuthUser, AutomationTrigger } from '@crm/shared';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() trigger: string;
  @ApiPropertyOptional() @IsOptional() conditions?: unknown[];
  @ApiProperty() actions: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('automations') private readonly automationQueue: Queue,
  ) {}

  async create(dto: CreateAutomationRuleDto, user: AuthUser) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        conditions: (dto.conditions as object[]) || [],
        actions: dto.actions as object[],
        isEnabled: dto.isEnabled ?? true,
        organizationId: user.organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { workflowLogs: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, organizationId },
      include: {
        workflowLogs: { orderBy: { executedAt: 'desc' }, take: 20 },
      },
    });

    if (!rule) throw new NotFoundException('Règle introuvable');
    return rule;
  }

  async update(id: string, dto: Partial<CreateAutomationRuleDto>, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...dto,
        conditions: dto.conditions as object[] | undefined,
        actions: dto.actions as object[] | undefined,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.automationRule.delete({ where: { id } });
    return { message: 'Règle supprimée' };
  }

  /**
   * Point d'entrée principal : déclenche les règles d'automatisation correspondant au trigger.
   * Les règles synchrones (légères) sont exécutées immédiatement.
   * Les règles avec webhooks sont passées à BullMQ (async).
   */
  async trigger(event: AutomationTrigger | string, payload: unknown, organizationId: string) {
    const rules = await this.prisma.automationRule.findMany({
      where: { trigger: event, organizationId, isEnabled: true },
    });

    for (const rule of rules) {
      const actions = rule.actions as Array<{ type: string; [k: string]: unknown }>;
      const hasWebhook = actions.some((a) => a.type === 'send_webhook');

      if (hasWebhook) {
        // Traitement asynchrone via BullMQ
        await this.automationQueue.add('execute', {
          ruleId: rule.id,
          organizationId,
          payload,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
      } else {
        // Traitement synchrone direct
        await this.executeRule(rule, payload, organizationId);
      }
    }
  }

  async executeRule(
    rule: { id: string; actions: unknown; conditions: unknown },
    payload: unknown,
    organizationId: string,
  ) {
    const start = Date.now();
    const actions = rule.actions as Array<{ type: string; [k: string]: unknown }>;

    try {
      for (const action of actions) {
        await this.executeAction(action, payload, organizationId);
      }

      await this.prisma.$transaction([
        this.prisma.workflowLog.create({
          data: {
            ruleId: rule.id,
            organizationId,
            status: 'success',
            input: payload as object,
            durationMs: Date.now() - start,
          },
        }),
        this.prisma.automationRule.update({
          where: { id: rule.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        }),
      ]);
    } catch (error) {
      this.logger.error(`Automation ${rule.id} failed`, error);
      await this.prisma.workflowLog.create({
        data: {
          ruleId: rule.id,
          organizationId,
          status: 'failed',
          input: payload as object,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          durationMs: Date.now() - start,
        },
      });
    }
  }

  private async executeAction(
    action: { type: string; [k: string]: unknown },
    payload: unknown,
    organizationId: string,
  ) {
    switch (action.type) {
      case 'create_task':
        await this.prisma.task.create({
          data: {
            title: (action.title as string) || 'Tâche automatique',
            description: action.description as string | undefined,
            organizationId,
            projectId: action.projectId as string | undefined,
            assigneeId: action.assigneeId as string | undefined,
          },
        });
        break;

      case 'create_project': {
        const p = payload as { id?: string; contactId?: string };
        await this.prisma.project.create({
          data: {
            name: (action.name as string) || 'Projet automatique',
            organizationId,
            dealId: p?.id,
            contactId: p?.contactId,
          },
        });
        break;
      }

      case 'create_notification': {
        const target = action.assigneeId as string | undefined;
        if (target) {
          await this.prisma.notification.create({
            data: {
              userId: target,
              organizationId,
              type: 'automation_triggered',
              title: (action.title as string) || 'Automatisation déclenchée',
              body: action.body as string | undefined,
              payload: { trigger: action.type, ...((payload as object) || {}) },
            },
          });
        }
        break;
      }

      case 'send_webhook':
        // Délégué au WebhooksModule (appelé depuis le worker)
        this.logger.log(`Webhook action — délégué au worker pour org ${organizationId}`);
        break;

      default:
        this.logger.warn(`Action inconnue : ${action.type}`);
    }
  }
}
