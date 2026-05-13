import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Headers,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  ContractsService,
  CreateContractDto,
  CreateContractFolderDto,
  CreateContractTemplateDto,
  CreateContractFromTemplateDto,
  SendForSignatureDto,
  MoveContractFolderDto,
  SignatureReminderDto,
  EnvelopeReminderDto,
  ProviderStatusUpdateDto,
  ExternalSignatureCallbackDto,
  ContractEventsQueryDto,
  ProductionWebhookTestDto,
  ContractRunbookPatchDto,
} from './contracts.service';
import { PaginationDto } from '../common/pipes/pagination.pipe';
import { CurrentUser, Public, Roles } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';
import { ContractActivityType } from '@prisma/client';

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
  @ApiOperation({ summary: 'Envoyer pour signature (interne ou externe)' })
  sendForSignature(
    @Param('id') id: string,
    @Body() dto: SendForSignatureDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.sendForSignature(id, user, dto);
  }

  @Post(':id/mark-to-modify')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Marquer un contrat comme "à modifier"' })
  markToModify(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.markToModify(id, user);
  }

  @Get('folders/tree')
  @ApiOperation({ summary: 'Lister les dossiers/sous-dossiers de contrats' })
  listFolders(@CurrentUser() user: AuthUser) {
    return this.contractsService.listFolders(user);
  }

  @Post('folders')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un dossier de contrats' })
  createFolder(@Body() dto: CreateContractFolderDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.createFolder(dto, user);
  }

  @Put('folders/:id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Mettre à jour un dossier de contrats' })
  updateFolder(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContractFolderDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.updateFolder(id, dto, user);
  }

  @Delete('folders/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un dossier de contrats' })
  removeFolder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.removeFolder(id, user);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Lister les modèles de contrats par activité' })
  @ApiQuery({ name: 'activityType', required: false, enum: ContractActivityType })
  listTemplates(@CurrentUser() user: AuthUser, @Query('activityType') activityType?: ContractActivityType) {
    return this.contractsService.listTemplates(user, activityType);
  }

  @Post('templates')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un modèle de contrat' })
  createTemplate(@Body() dto: CreateContractTemplateDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.createTemplate(dto, user);
  }

  @Put('templates/:id')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Mettre à jour un modèle de contrat' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContractTemplateDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.updateTemplate(id, dto, user);
  }

  @Delete('templates/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un modèle de contrat' })
  removeTemplate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.removeTemplate(id, user);
  }

  @Post('from-template')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Créer un contrat depuis un modèle avec préremplissage' })
  createFromTemplate(@Body() dto: CreateContractFromTemplateDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.createFromTemplate(dto, user);
  }

  @Post(':id/move-folder')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Déplacer un contrat vers un dossier/sous-dossier' })
  moveFolder(
    @Param('id') id: string,
    @Body() dto: MoveContractFolderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.moveContractToFolder(id, dto, user);
  }

  @Post(':id/remind-signature')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Relancer la signature d\'un contrat' })
  remindSignature(
    @Param('id') id: string,
    @Body() dto: SignatureReminderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.remindForSignature(id, dto, user);
  }

  @Post('remind-signature-by-envelope')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Relancer une signature via providerEnvelopeId' })
  remindSignatureByEnvelope(@Body() dto: EnvelopeReminderDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.remindForSignatureByEnvelope(dto, user);
  }

  @Post(':id/external-signed')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Marquer signé suite callback prestataire externe' })
  externalSigned(
    @Param('id') id: string,
    @Body() dto: ExternalSignatureCallbackDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.markSignedByExternalProvider(id, dto, user);
  }

  @Post(':id/provider-status')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Mettre a jour manuellement un statut provider (ops)' })
  updateProviderStatus(
    @Param('id') id: string,
    @Body() dto: ProviderStatusUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.updateProviderStatus(id, dto, user);
  }

  @Post('public/external-callback/:id')
  @Public()
  @ApiOperation({ summary: 'Callback public prestataire signature externe' })
  externalSignedPublic(
    @Param('id') id: string,
    @Body() dto: ExternalSignatureCallbackDto,
    @Headers('x-callback-secret') callbackSecret?: string,
  ) {
    return this.contractsService.markSignedByExternalProviderPublic(id, dto, callbackSecret);
  }

  @Post('public/external-callback')
  @Public()
  @ApiOperation({ summary: 'Callback public prestataire (resolution par envelopeId/contractId)' })
  externalSignedPublicByEnvelope(
    @Body() dto: ExternalSignatureCallbackDto,
    @Headers('x-callback-secret') callbackSecret?: string,
  ) {
    return this.contractsService.markSignedByExternalProviderPublic(undefined, dto, callbackSecret);
  }

  @Get('events/timeline')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Centre d evenements contrats/documents/messages' })
  listEventTimeline(@CurrentUser() user: AuthUser, @Query() query: ContractEventsQueryDto) {
    return this.contractsService.listEventTimeline(user, query);
  }

  @Get('ops/readiness')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Checklist de mise en production signatures/ops' })
  getProductionReadiness(@CurrentUser() user: AuthUser) {
    return this.contractsService.getProductionReadinessChecklist(user);
  }

  @Post('ops/test-webhook')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Tester un webhook de production' })
  testProductionWebhook(@CurrentUser() user: AuthUser, @Body() dto: ProductionWebhookTestDto) {
    return this.contractsService.testProductionWebhook(user, dto);
  }

  @Patch('ops/readiness/runbook')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Runbook E2E contrats — coches persistees dans organization.settings' })
  patchContractsRunbook(@Body() dto: ContractRunbookPatchDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.patchContractsProductionRunbook(user, dto);
  }

  @Get(':id/audit')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Audit signature et timeline d un contrat' })
  getContractAudit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.getContractAudit(id, user);
  }

  @Get(':id/audit/export')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Exporter l audit d un contrat (JSON)' })
  exportContractAudit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.exportContractAudit(id, user);
  }

  @Get(':id/audit/export-pdf')
  @Roles('admin', 'member')
  @ApiOperation({ summary: 'Exporter l audit d un contrat (PDF)' })
  exportContractAuditPdf(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.exportContractAuditPdf(id, user);
  }

  @Post('events/run-auto-reminders')
  @Roles('admin')
  @ApiOperation({ summary: 'Executer manuellement les relances automatiques (J+3/J+7)' })
  runAutoReminders() {
    return this.contractsService.runAutoSignatureReminders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un contrat' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.findOne(id, user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un contrat' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.remove(id, user);
  }
}
