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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
    @Body() body: { contactId?: string; dealId?: string; projectId?: string; accountId?: string; description?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload({ file, ...body, organizationId: user.organizationId }, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les documents (filtrable par contact, projet, deal, entreprise)' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('contactId') contactId?: string,
    @Query('projectId') projectId?: string,
    @Query('dealId') dealId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.documentsService.findAll(user.organizationId, { contactId, projectId, dealId, accountId });
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
