import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('documents')
@ApiBearerAuth('supabase-jwt')
@Controller('documents')
@Roles('admin', 'member')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Uploader un document vers Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      contactId?: string;
      dealId?: string;
      projectId?: string;
      accountId?: string;
      ticketId?: string;
      description?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload({ file, ...body, organizationId: user.organizationId }, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les documents (filtrable par contact, projet, deal, entreprise, ticket)' })
  @ApiQuery({ name: 'q', required: false, description: 'Recherche texte (nom, description, mimeType)' })
  @ApiQuery({ name: 'mimePrefix', required: false, description: 'Préfixe MIME (ex: image/, application/pdf)' })
  @ApiQuery({ name: 'linkedTo', required: false, enum: ['deal', 'project', 'contact', 'account', 'ticket', 'unlinked'] })
  @ApiQuery({ name: 'from', required: false, description: 'Date min createdAt (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date max createdAt (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'oldest', 'name_asc', 'name_desc', 'size_desc', 'size_asc'] })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('contactId') contactId?: string,
    @Query('projectId') projectId?: string,
    @Query('dealId') dealId?: string,
    @Query('accountId') accountId?: string,
    @Query('ticketId') ticketId?: string,
    @Query('q') q?: string,
    @Query('mimePrefix') mimePrefix?: string,
    @Query('linkedTo') linkedTo?: 'deal' | 'project' | 'contact' | 'account' | 'ticket' | 'unlinked',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc',
  ) {
    return this.documentsService.findAll(user.organizationId, {
      contactId,
      projectId,
      dealId,
      accountId,
      ticketId,
      q,
      mimePrefix,
      linkedTo,
      from,
      to,
      sort,
    });
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Obtenir une URL signée de téléchargement (1h)' })
  getSignedUrl(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getSignedUrl(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.remove(id, user);
  }
}
