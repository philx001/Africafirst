import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationWorker } from './workers/automation.worker';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'automations' }),
    WebhooksModule,
    NotificationsModule,
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationWorker],
  exports: [AutomationsService],
})
export class AutomationsModule {}
