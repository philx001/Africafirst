import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DealsService, CreateDealDto } from './deals.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, DealStage } from '@crm/shared';

@ApiTags('deals')
@ApiBearerAuth('supabase-jwt')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un deal' })
  create(@Body() dto: CreateDealDto, @CurrentUser() user: AuthUser) {
    return this.dealsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les deals (paginé, filtrable par stage)' })
  @ApiQuery({ name: 'stage', required: false, enum: ['lead','qualified','proposal','negotiation','won','lost'] })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('stage') stage?: DealStage,
  ) {
    return this.dealsService.findAll(pagination, user, stage);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Vue kanban — deals groupés par stage' })
  getKanban(@CurrentUser() user: AuthUser) {
    return this.dealsService.getKanban(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un deal' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.dealsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier un deal (changement de stage déclenche automatisations)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateDealDto>, @CurrentUser() user: AuthUser) {
    return this.dealsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un deal' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.dealsService.remove(id, user);
  }
}
