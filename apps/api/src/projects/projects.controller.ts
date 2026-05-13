import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto, UpdateProjectPhaseDto } from './projects.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, ProjectStatus } from '@crm/shared';
import { ApplyProjectTemplateDto } from '../project-templates/project-templates.service';

@ApiTags('projects')
@ApiBearerAuth('supabase-jwt')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un projet' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les projets' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ProjectStatus,
    @Query('dealId') dealId?: string,
  ) {
    return this.projectsService.findAll(pagination, user, status, dealId);
  }

  @Post(':id/phases/bootstrap')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer les phases par défaut si absentes (idempotent)' })
  bootstrapPhases(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.bootstrapPhases(id, user);
  }

  @Post(':id/phases/apply-template')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Appliquer un modèle de phases au projet (si aucune phase existante)' })
  applyTemplate(@Param('id') id: string, @Body() dto: ApplyProjectTemplateDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.applyTemplate(id, dto, user);
  }

  @Patch(':id/phases/:phaseId')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une phase (terminé, ignoré, N/A, …)' })
  updatePhase(
    @Param('id') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateProjectPhaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.updatePhase(projectId, phaseId, dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un projet avec ses tâches' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier un projet' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>, @CurrentUser() user: AuthUser) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un projet' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user);
  }
}
