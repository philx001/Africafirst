import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService, CreateTaskDto } from './tasks.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, TaskStatus } from '@crm/shared';

@ApiTags('tasks')
@ApiBearerAuth('supabase-jwt')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer une tâche ou sous-tâche' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les tâches (filtrable par projet, assigné, statut)' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.tasksService.findAll(pagination, user, { projectId, assigneeId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une tâche avec sous-tâches' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une tâche (mise à jour statut recalcule la progression du projet)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTaskDto>, @CurrentUser() user: AuthUser) {
    return this.tasksService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Supprimer une tâche' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.remove(id, user);
  }
}
