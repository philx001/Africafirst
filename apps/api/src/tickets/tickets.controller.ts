import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  TicketsService,
  CreateTicketDto,
  UpdateTicketDto,
} from './tickets.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, TicketStatus } from '@crm/shared';

@ApiTags('tickets')
@ApiBearerAuth('supabase-jwt')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un ticket (interne)' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.create(dto, user);
  }

  @Get()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Lister les tickets' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: TicketStatus,
    @Query('projectId') projectId?: string,
    @Query('contactId') contactId?: string,
    @Query('accountId') accountId?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.ticketsService.findAll(pagination, user, {
      status,
      projectId,
      contactId,
      accountId,
      assigneeId,
    });
  }

  @Get(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Détail d’un ticket' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Mettre à jour un ticket' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Supprimer un ticket' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.remove(id, user);
  }
}
