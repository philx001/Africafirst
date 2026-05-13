import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@crm/shared';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import {
  ApplyProjectTemplateDto,
  CreateProjectTemplateDto,
  CreateProjectTemplatePhaseDto,
  ProjectTemplatesService,
} from './project-templates.service';

@ApiTags('project-templates')
@ApiBearerAuth('supabase-jwt')
@Controller('project-templates')
@Roles('admin', 'member')
export class ProjectTemplatesController {
  constructor(private readonly projectTemplates: ProjectTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les modèles de projet/phases' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('offerType') offerType?: CreateProjectTemplateDto['offerType'],
    @Query('active') active?: string,
  ) {
    return this.projectTemplates.list(user, {
      offerType,
      active: active === undefined ? undefined : active === 'true',
    });
  }

  @Post()
  @ApiOperation({ summary: 'Créer un modèle de projet/phases' })
  create(@Body() dto: CreateProjectTemplateDto, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un modèle de projet/phases' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un modèle de projet/phases' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectTemplateDto>, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Désactiver un modèle de projet/phases' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.deactivate(id, user);
  }

  @Post(':id/phases')
  @ApiOperation({ summary: 'Ajouter une phase à un modèle' })
  addPhase(@Param('id') id: string, @Body() dto: CreateProjectTemplatePhaseDto, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.addPhase(id, dto, user);
  }

  @Patch(':id/phases/:phaseId')
  @ApiOperation({ summary: 'Modifier une phase de modèle' })
  updatePhase(
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: Partial<CreateProjectTemplatePhaseDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectTemplates.updatePhase(id, phaseId, dto, user);
  }

  @Delete(':id/phases/:phaseId')
  @ApiOperation({ summary: 'Supprimer une phase de modèle' })
  removePhase(@Param('id') id: string, @Param('phaseId') phaseId: string, @CurrentUser() user: AuthUser) {
    return this.projectTemplates.removePhase(id, phaseId, user);
  }

  @Post('/projects/:projectId/apply')
  @ApiOperation({ summary: 'Appliquer un modèle à un projet sans phases existantes' })
  applyToProject(
    @Param('projectId') projectId: string,
    @Body() dto: ApplyProjectTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectTemplates.instantiateForProject(projectId, user, dto);
  }
}
