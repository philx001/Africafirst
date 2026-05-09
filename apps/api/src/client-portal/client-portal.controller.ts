import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientPortalService } from './client-portal.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';
import { Request } from 'express';

@ApiTags('client-portal')
@ApiBearerAuth('supabase-jwt')
@Roles('client')
@Controller('client')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard client — résumé projets, documents, messages' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getDashboard(user);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Projets du client avec tâches' })
  getProjects(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getProjects(user);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Documents accessibles par le client' })
  getDocuments(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getDocuments(user);
  }

  @Get('documents/:id/signed-url')
  @ApiOperation({ summary: 'URL signée pour télécharger un document (1h)' })
  getDocumentUrl(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientPortalService.getDocumentSignedUrl(id, user);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Messagerie client (marque les messages comme lus)' })
  getMessages(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getMessages(user);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Envoyer un message à l\'équipe' })
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Body() body: { content: string; projectId?: string },
  ) {
    return this.clientPortalService.sendMessage(user, body.content, body.projectId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notifications du client' })
  getNotifications(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getNotifications(user);
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Contrats à signer ou signés (portail client)' })
  getContracts(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getContracts(user);
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Détail d\'un contrat côté portail' })
  getContract(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientPortalService.getContract(id, user);
  }

  @Post('contracts/:id/sign')
  @ApiOperation({ summary: 'Signer électroniquement le contrat' })
  signContract(
    @Param('id') id: string,
    @Body() body: { acknowledge: boolean },
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.clientPortalService.signContract(id, user, body.acknowledge, req);
  }
}
