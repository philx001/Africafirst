import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService, CreateAutomationRuleDto } from './automations.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('automations')
@ApiBearerAuth('supabase-jwt')
@Roles('admin')
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une règle d\'automatisation' })
  create(@Body() dto: CreateAutomationRuleDto, @CurrentUser() user: AuthUser) {
    return this.automationsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les règles d\'automatisation' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.automationsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une règle avec ses logs d\'exécution' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.automationsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une règle' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAutomationRuleDto>, @CurrentUser() user: AuthUser) {
    return this.automationsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une règle' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.automationsService.remove(id, user.organizationId);
  }

  @Post('templates/provider-defaults')
  @ApiOperation({ summary: 'Installer les templates provider (failed/declined)' })
  ensureProviderDefaults(@CurrentUser() user: AuthUser) {
    return this.automationsService.ensureProviderDefaultRules(user);
  }
}
