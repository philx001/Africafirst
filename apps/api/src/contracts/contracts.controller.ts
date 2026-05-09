import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContractsService, CreateContractDto } from './contracts.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('contracts')
@ApiBearerAuth('supabase-jwt')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un contrat (brouillon)' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.create(dto, user);
  }

  @Post('from-quote/:quoteId')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un brouillon de contrat à partir d\'un devis accepté' })
  fromQuote(@Param('quoteId') quoteId: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.fromQuote(quoteId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les contrats' })
  @ApiQuery({ name: 'dealId', required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('dealId') dealId?: string,
  ) {
    return this.contractsService.findAll(pagination, user, dealId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un contrat' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Modifier un contrat (brouillon uniquement)' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContractDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.update(id, dto, user);
  }

  @Post(':id/send-for-signature')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Envoyer pour signature (portail client + token)' })
  sendForSignature(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.sendForSignature(id, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un contrat' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.remove(id, user);
  }
}
