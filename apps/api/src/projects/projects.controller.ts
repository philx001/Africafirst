import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto } from './projects.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, ProjectStatus } from '@crm/shared';

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
  ) {
    return this.projectsService.findAll(pagination, user, status);
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
