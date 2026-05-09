import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('organizations')
@ApiBearerAuth('supabase-jwt')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Détails de mon organisation' })
  findOne(@CurrentUser() user: AuthUser) {
    return this.organizationsService.findOne(user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales du dashboard' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.organizationsService.getStats(user);
  }

  @Put('me')
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier les paramètres de l\'organisation' })
  update(@CurrentUser() user: AuthUser, @Body() body: { name?: string; settings?: object }) {
    return this.organizationsService.update(user, body);
  }
}
