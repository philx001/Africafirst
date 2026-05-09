import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('contacts')
@ApiBearerAuth('supabase-jwt')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un contact' })
  create(@Body() dto: CreateContactDto, @CurrentUser() user: AuthUser) {
    return this.contactsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les contacts (paginé, recherche)' })
  findAll(@Query() pagination: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.contactsService.findAll(pagination, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un contact' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contactsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier un contact' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContactDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contactsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un contact' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contactsService.remove(id, user);
  }
}
