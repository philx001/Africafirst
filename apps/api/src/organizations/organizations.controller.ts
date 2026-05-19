import { Controller, Get, Put, Body, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { OrganizationsService } from './organizations.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';
import { IsArray, IsIn, IsOptional, Matches } from 'class-validator';

export class RunScheduledExportsDto {
  @IsOptional()
  @IsArray()
  @IsIn(['deals', 'contacts', 'projects', 'tickets'], { each: true })
  datasets?: Array<'deals' | 'contacts' | 'projects' | 'tickets'>;

  @IsOptional()
  @Matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  to?: string;
}

const DRILLDOWN_METRICS = [
  'totalContacts',
  'pipelineDeals',
  'conversionRate',
  'totalProjects',
  'activeTasks',
  'totalRevenue',
  'ticketsActive',
] as const;

type DrilldownMetric = (typeof DRILLDOWN_METRICS)[number];

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
  @ApiOperation({
    summary:
      'Statistiques globales du dashboard (optionnel : plage UTC YYYY‑MM‑DD ; avec série activité deals sur la fenêtre)',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Début de période (YYYY-MM-DD, UTC minuit). Obligatoire avec `to` pour filtrer.',
    example: '2026-05-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Fin de période (YYYY-MM-DD, UTC fin de journée). Obligatoire avec `from`.',
    example: '2026-05-31',
  })
  getStats(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.organizationsService.getStats(user, { from, to });
  }

  @Get('stats/drilldown')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Détail d’un KPI dashboard (liste filtrée)' })
  @ApiQuery({ name: 'metric', enum: DRILLDOWN_METRICS, required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getStatsDrilldown(
    @CurrentUser() user: AuthUser,
    @Query('metric') metric: DrilldownMetric,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number.parseInt(limit, 10) : undefined;
    return this.organizationsService.getStatsDrilldown(user, metric, {
      from,
      to,
      limit: Number.isFinite(lim) ? lim : undefined,
    });
  }

  @Get('stats/tickets-activity-drilldown')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Détail activité tickets sur un bucket (jour ou semaine)' })
  @ApiQuery({ name: 'periodStart', required: true, description: 'Date bucket (YYYY-MM-DD)' })
  @ApiQuery({ name: 'granularity', required: true, enum: ['day', 'week'] })
  @ApiQuery({ name: 'activity', required: true, enum: ['created', 'resolved', 'closed'] })
  @ApiQuery({ name: 'limit', required: false })
  getTicketActivityDrilldown(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart: string,
    @Query('granularity') granularity: string,
    @Query('activity') activity: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number.parseInt(limit, 10) : undefined;
    return this.organizationsService.getTicketActivityDrilldown(user, {
      periodStart,
      granularity,
      activity,
      limit: Number.isFinite(lim) ? lim : undefined,
    });
  }

  @Roles('admin', 'member')
  @Get('export/deals')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export CSV des deals (organisation courante)' })
  async exportDeals(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.organizationsService.exportDealsCsv(user);
    const filename = `crm-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Roles('admin', 'member')
  @Get('export/contacts')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export CSV des contacts (organisation courante)' })
  async exportContacts(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.organizationsService.exportContactsCsv(user);
    const filename = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Roles('admin', 'member')
  @Get('export/projects')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export CSV des projets (organisation courante)' })
  async exportProjects(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.organizationsService.exportProjectsCsv(user);
    const filename = `crm-projects-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Roles('admin', 'member')
  @Get('export/tickets')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export CSV des tickets support (organisation courante)' })
  async exportTickets(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.organizationsService.exportTicketsCsv(user);
    const filename = `crm-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Roles('admin', 'member')
  @Get('export/scheduled')
  @ApiOperation({ summary: 'Lister les exports CSV planifiés déjà générés (documents internes)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre max (défaut 20, max 100).' })
  listScheduled(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number.parseInt(limit, 10) : undefined;
    return this.organizationsService.listScheduledExports(user, Number.isFinite(lim) ? lim : undefined);
  }

  @Roles('admin', 'member')
  @Put('export/scheduled/run-now')
  @ApiOperation({
    summary: 'Lancer immédiatement les exports planifiés pour l’organisation courante',
  })
  runScheduledNow(@CurrentUser() user: AuthUser, @Body() body: RunScheduledExportsDto) {
    return this.organizationsService.runScheduledExportsNow(user, body.datasets, {
      from: body.from,
      to: body.to,
    });
  }

  @Put('me')
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier les paramètres de l\'organisation' })
  update(@CurrentUser() user: AuthUser, @Body() body: { name?: string; settings?: object }) {
    return this.organizationsService.update(user, body);
  }
}
