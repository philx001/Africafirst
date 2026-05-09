import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService, CreateAccountDto } from './accounts.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('accounts')
@ApiBearerAuth('supabase-jwt')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer une entreprise' })
  create(@Body() dto: CreateAccountDto, @CurrentUser() user: AuthUser) {
    return this.accountsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les entreprises' })
  findAll(@Query() pagination: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.accountsService.findAll(pagination, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une entreprise' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.accountsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier une entreprise' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAccountDto>, @CurrentUser() user: AuthUser) {
    return this.accountsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer une entreprise' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.accountsService.remove(id, user);
  }
}
