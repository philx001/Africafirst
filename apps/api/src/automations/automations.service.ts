import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma, Priority } from '@prisma/client';
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

  async ensureProviderDefaultRules(user: AuthUser) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    const integrationWebhookUrl =
      (settings.communicationWebhookUrl as string | undefined) ||
      (settings.contractSignatureReminderWebhookUrl as string | undefined);
    const integrationWebhookSecret =
      (settings.communicationWebhookSecret as string | undefined) ||
      (settings.contractSignatureReminderWebhookSecret as string | undefined);

    const templates: Array<{
      name: string;
      description: string;
      trigger: string;
      actions: Array<Record<string, unknown>>;
    }> = [
      {
        name: 'Playbook provider failed (ops)',
        description: 'Playbook multi-actions: notif admin + tache urgente + webhook SI.',
        trigger: 'contract.signature.failed',
        actions: [
          {
            type: 'create_notification',
            title: 'Incident signature externe',
            body: 'Echec provider detecte. Verifier la cause et appliquer l action recommandee.',
            assigneeId: user.id,
          },
          {
            type: 'create_task',
            title: 'Traiter incident signature externe',
            description: 'Verifier la cause provider, contacter le client si besoin, puis relancer.',
            assigneeId: user.id,
            priority: 'urgent',
            dueInHours: 4,
          },
          ...(integrationWebhookUrl
            ? [
                {
                  type: 'send_webhook',
                  url: integrationWebhookUrl,
                  secret: integrationWebhookSecret,
                } as Record<string, unknown>,
              ]
            : []),
        ],
      },
      {
        name: 'Playbook provider declined (follow-up)',
        description: 'Playbook multi-actions en cas de refus: notif + tache de suivi prioritaire.',
        trigger: 'contract.signature.declined',
        actions: [
          {
            type: 'create_notification',
            title: 'Signature refusee par le client',
            body: 'Un signataire a refuse le contrat. Revoir les conditions et re-emettre.',
            assigneeId: user.id,
          },
          {
            type: 'create_task',
            title: 'Suivi refus signature contrat',
            description: 'Contacter le client, ajuster le contrat, puis renvoyer la signature.',
            assigneeId: user.id,
            priority: 'high',
            dueInHours: 24,
          },
        ],
      },
    ];

    const created: string[] = [];
    const existing: string[] = [];
    for (const template of templates) {
      const already = await this.prisma.automationRule.findFirst({
        where: {
          organizationId: user.organizationId,
          trigger: template.trigger,
          name: template.name,
        },
        select: { id: true },
      });
      if (already) {
        existing.push(template.name);
        continue;
      }
      await this.prisma.automationRule.create({
        data: {
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          conditions: [] as Prisma.InputJsonValue,
          actions: template.actions as unknown as Prisma.InputJsonValue,
          isEnabled: true,
          organizationId: user.organizationId,
        },
      });
      created.push(template.name);
    }

    return { created, existing, integrationWebhookConfigured: Boolean(integrationWebhookUrl) };
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
        // Traitement asynchrone via BullMQ — ne pas faire échouer l'API métier si Redis est indispo
        try {
          await this.automationQueue.add(
            'execute',
            {
              ruleId: rule.id,
              organizationId,
              payload,
            },
            { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
          );
        } catch (enqueueError) {
          this.logger.warn(
            `Impossible d'enfiler l'automatisation ${rule.id} (Redis/Bull?) — ${enqueueError instanceof Error ? enqueueError.message : 'erreur inconnue'}`,
          );
        }
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
        {
        const requestedPriority = String(action.priority ?? 'medium') as Priority;
        const priority: Priority = ['low', 'medium', 'high', 'urgent'].includes(requestedPriority)
          ? requestedPriority
          : 'medium';
        const dueInHours =
          typeof action.dueInHours === 'number' && Number.isFinite(action.dueInHours)
            ? Number(action.dueInHours)
            : undefined;
        const dueAt = dueInHours ? new Date(Date.now() + dueInHours * 60 * 60 * 1000) : undefined;
        await this.prisma.task.create({
          data: {
            title: (action.title as string) || 'Tâche automatique',
            description: action.description as string | undefined,
            organizationId,
            projectId: action.projectId as string | undefined,
            assigneeId: action.assigneeId as string | undefined,
            priority,
            dueAt,
          },
        });
        break;
        }

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
