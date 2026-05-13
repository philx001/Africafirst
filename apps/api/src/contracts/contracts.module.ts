import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsRemindersScheduler } from './contracts-reminders.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AutomationsModule } from '../automations/automations.module';
import { ProjectTemplatesModule } from '../project-templates/project-templates.module';

@Module({
  imports: [NotificationsModule, WebhooksModule, AutomationsModule, ProjectTemplatesModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsRemindersScheduler],
  exports: [ContractsService],
})
export class ContractsModule {}
