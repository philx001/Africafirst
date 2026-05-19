import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsExportsScheduler } from './organizations-exports.scheduler';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsExportsScheduler],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
