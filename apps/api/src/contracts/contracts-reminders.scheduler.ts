import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContractsService } from './contracts.service';

@Injectable()
export class ContractsRemindersScheduler {
  private readonly logger = new Logger(ContractsRemindersScheduler.name);

  constructor(private readonly contractsService: ContractsService) {}

  // Every 6 hours: send J+3 and J+7 automatic reminders.
  @Cron('0 */6 * * *')
  async runSignatureReminders() {
    const result = await this.contractsService.runAutoSignatureReminders();
    if (result.remindersSent > 0) {
      this.logger.log(
        `Relances signature envoyees: ${result.remindersSent} / contrats analyses: ${result.scanned}`,
      );
    }
  }
}
