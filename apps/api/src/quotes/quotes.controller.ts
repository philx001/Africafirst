import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService, CreateQuoteDto } from './quotes.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('quotes')
@ApiBearerAuth('supabase-jwt')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un devis' })
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les devis (filtrable par deal)' })
  @ApiQuery({ name: 'dealId', required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('dealId') dealId?: string,
  ) {
    return this.quotesService.findAll(pagination, user, dealId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un devis' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotesService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier un devis (brouillon uniquement)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuoteDto>, @CurrentUser() user: AuthUser) {
    return this.quotesService.update(id, dto, user);
  }

  @Post(':id/send')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Envoyer le devis au contact (statut → envoyé)' })
  send(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotesService.send(id, user);
  }

  @Post(':id/accept')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Marquer le devis comme accepté' })
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotesService.accept(id, user);
  }

  @Post(':id/reject')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Marquer le devis comme refusé' })
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotesService.reject(id, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un devis' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotesService.remove(id, user);
  }
}
