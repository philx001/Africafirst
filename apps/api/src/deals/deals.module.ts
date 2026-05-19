import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationsModule } from '../automations/automations.module';
import { ProjectTemplatesModule } from '../project-templates/project-templates.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [NotificationsModule, AutomationsModule, ProjectTemplatesModule, WebhooksModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
