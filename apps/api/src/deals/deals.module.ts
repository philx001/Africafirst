import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [NotificationsModule, AutomationsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
