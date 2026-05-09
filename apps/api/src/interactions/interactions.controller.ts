import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InteractionsService, CreateInteractionDto } from './interactions.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, InteractionType } from '@crm/shared';

@ApiTags('interactions')
@ApiBearerAuth('supabase-jwt')
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Enregistrer une interaction (email, appel, réunion, note)' })
  create(@Body() dto: CreateInteractionDto, @CurrentUser() user: AuthUser) {
    return this.interactionsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les interactions (filtrable par contact, deal, projet, type)' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('contactId') contactId?: string,
    @Query('dealId') dealId?: string,
    @Query('projectId') projectId?: string,
    @Query('type') type?: InteractionType,
  ) {
    return this.interactionsService.findAll(pagination, user, { contactId, dealId, projectId, type });
  }

  @Delete(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Supprimer une interaction' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.interactionsService.remove(id, user);
  }
}
