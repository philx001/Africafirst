'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QuoteTemplatesPanel } from '@/components/crm/quotes/quote-templates-panel';

interface ContractRow {
  id: string;
  title: string;
  status: string;
  activityType: string;
  value?: number | null;
  currency: string;
  signatureProvider: 'internal_portal' | 'external_webhook';
  folderPath?: string | null;
  sentForSignatureAt?: string | null;
  signedAt?: string | null;
  deal?: { id: string; title: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
  folder?: { id: string; name: string; parentId?: string | null } | null;
  template?: { id: string; title: string; activityType: string } | null;
  signatureMetadata?: Record<string, unknown> | null;
}

type Paginated<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };
type Folder = { id: string; name: string; parentId?: string | null; _count?: { contracts: number } };
type ContractTemplate = {
  id: string;
  title: string;
  description?: string | null;
  activityType: string;
  content: string;
  isDefault: boolean;
};
type Contact = { id: string; firstName: string; lastName: string; email?: string | null };
type Account = { id: string; name: string };
type Deal = { id: string; title: string };
type ContractEvent = {
  id: string;
  kind: string;
  timestamp: string;
  title: string;
  description?: string;
  entityType: 'contract' | 'document' | 'message' | 'notification';
  entityId: string;
  contractId?: string;
  contactId?: string;
};
type ContractAudit = {
  contract: {
    id: string;
    title: string;
    status: string;
    signatureProvider: string;
    sentForSignatureAt?: string | null;
    signedAt?: string | null;
    signedByContactId?: string | null;
    signatoryIp?: string | null;
    signatoryUserAgent?: string | null;
  };
  evidence: {
    signatureMetadata: Record<string, unknown>;
    reminderHistory: Array<Record<string, unknown>>;
    providerEventHistory?: Array<Record<string, unknown>>;
    providerFailureReason?: string | null;
    providerRecommendedAction?: string | null;
  };
};
type ReadinessItem = {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  recommendation: string;
};
type RunbookStepItem = { id: string; label: string; checked: boolean };
type ReadinessResponse = {
  checklist: ReadinessItem[];
  summary: {
    score: number;
    total: number;
    readinessLevel: 'ready' | 'almost_ready' | 'not_ready';
  };
  runbook: {
    steps: RunbookStepItem[];
    completed: number;
    total: number;
    updatedAt: string | null;
  };
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  to_modify: 'A modifier',
  sent_for_signature: 'En attente signature',
  signed: 'Signé',
  cancelled: 'Annule',
};

const ACTIVITY_LABELS: Record<string, string> = {
  plateforme_formation: 'Plateforme de formation',
  creation_application_site: 'Creation application/site',
  conseil: 'Conseil',
  sensibilisation_formation_ia: 'Sensibilisation/Formation a l’IA',
  autre: 'Autre',
};

const EVENT_SCOPE_LABELS: Record<string, string> = {
  all: 'Tous',
  contracts: 'Contrats',
  documents: 'Documents',
  messages: 'Messages',
  notifications: 'Notifications',
};

const EVENT_ENTITY_LABELS: Record<string, string> = {
  contract: 'Contrat',
  document: 'Document',
  message: 'Message',
  notification: 'Notification',
};

const PROVIDER_STATUS_LABELS: Record<string, string> = {
  requested: 'Demande envoyee',
  viewed: 'Ouvert par signataire',
  declined: 'Refuse',
  signed: 'Signe',
  failed: 'Echec provider',
};

export function ContractsList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showCreateContractForm, setShowCreateContractForm] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateActivityType, setTemplateActivityType] = useState('autre');
  const [templateContent, setTemplateContent] = useState(
    `Objet: {{deal.title}}

Entre:
- {{organization.name}}
- {{account.name}}

Representant: {{contact.fullName}} ({{contact.jobTitle}})
Email: {{contact.email}}

Date: {{date.today}}
`,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [contractFolderId, setContractFolderId] = useState('');
  const [contractFolderPath, setContractFolderPath] = useState('');
  const [signatureModeByContract, setSignatureModeByContract] = useState<Record<string, 'internal_portal' | 'external_webhook'>>({});
  const [moveFolderByContract, setMoveFolderByContract] = useState<Record<string, string>>({});
  const [eventScope, setEventScope] = useState<'all' | 'contracts' | 'documents' | 'messages' | 'notifications'>(
    'all',
  );
  const [eventContractId, setEventContractId] = useState<string>('all');
  const [focusedContractId, setFocusedContractId] = useState<string | null>(null);
  const [openedAuditContractId, setOpenedAuditContractId] = useState<string | null>(null);
  const [envelopeReminderId, setEnvelopeReminderId] = useState('');
  const [webhookTestChannel, setWebhookTestChannel] = useState<
    'communication' | 'signature_request' | 'signature_signed' | 'signature_reminder'
  >('communication');

  const statusQuery = statusFilter === 'all' ? '' : statusFilter;
  const activityQuery = activityFilter === 'all' ? '' : activityFilter;
  const folderQuery = folderFilter === 'all' ? '' : folderFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'list', search, statusQuery, activityQuery, folderQuery],
    queryFn: () =>
      api.get(
        `/contracts?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}${statusQuery ? `&status=${statusQuery}` : ''}${activityQuery ? `&type=${activityQuery}` : ''}${folderQuery ? `&folderId=${folderQuery}` : ''}`,
      ) as Promise<Paginated<ContractRow>>,
  });

  const { data: folders } = useQuery({
    queryKey: ['contracts', 'folders'],
    queryFn: () => api.get('/contracts/folders/tree') as Promise<Folder[]>,
  });

  const { data: templates } = useQuery({
    queryKey: ['contracts', 'templates'],
    queryFn: () => api.get('/contracts/templates') as Promise<ContractTemplate[]>,
  });

  const { data: contactsRes } = useQuery({
    queryKey: ['contacts', 'all-for-contracts'],
    queryFn: () => api.get('/contacts?limit=200') as Promise<Paginated<Contact>>,
  });

  const { data: accountsRes } = useQuery({
    queryKey: ['accounts', 'all-for-contracts'],
    queryFn: () => api.get('/accounts?limit=200') as Promise<Paginated<Account>>,
  });

  const { data: dealsRes } = useQuery({
    queryKey: ['deals', 'all-for-contracts'],
    queryFn: () => api.get('/deals?limit=200') as Promise<Paginated<Deal>>,
  });

  const { data: timelineRes, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['contracts', 'timeline-events', eventScope, selectedContactId, eventContractId],
    queryFn: () =>
      api.get(
        `/contracts/events/timeline?limit=80&scope=${eventScope}${selectedContactId ? `&contactId=${selectedContactId}` : ''}${eventContractId !== 'all' ? `&contractId=${eventContractId}` : ''}`,
      ) as Promise<{ data: ContractEvent[]; meta: { total: number; limit: number; scope: string } }>,
  });

  const { data: openedContractAudit, isLoading: isAuditLoading } = useQuery({
    queryKey: ['contracts', 'audit', openedAuditContractId],
    queryFn: () => api.get(`/contracts/${openedAuditContractId}/audit`) as Promise<ContractAudit>,
    enabled: !!openedAuditContractId,
  });
  const { data: readinessData, isLoading: isReadinessLoading } = useQuery({
    queryKey: ['contracts', 'ops-readiness'],
    queryFn: () => api.get('/contracts/ops/readiness') as Promise<ReadinessResponse>,
  });

  const sendForSignature = useMutation({
    mutationFn: ({ id, provider }: { id: string; provider: 'internal_portal' | 'external_webhook' }) =>
      api.post(`/contracts/${id}/send-for-signature`, { provider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat envoyé pour signature');
    },
    onError: () => toast.error('Envoi impossible (configurer webhook externe si necessaire)'),
  });

  const createFolder = useMutation({
    mutationFn: () =>
      api.post('/contracts/folders', {
        name: folderName,
        parentId: parentFolderId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'folders'] });
      toast.success('Dossier cree');
      setFolderName('');
      setParentFolderId('');
      setShowFolderForm(false);
    },
    onError: () => toast.error('Creation du dossier impossible'),
  });

  const createTemplate = useMutation({
    mutationFn: () =>
      api.post('/contracts/templates', {
        title: templateTitle,
        description: templateDescription || undefined,
        activityType: templateActivityType,
        content: templateContent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'templates'] });
      toast.success('Modele cree');
      setTemplateTitle('');
      setTemplateDescription('');
      setShowTemplateForm(false);
    },
    onError: () => toast.error('Creation du modele impossible'),
  });

  const createContractFromTemplate = useMutation({
    mutationFn: () =>
      api.post('/contracts/from-template', {
        templateId: selectedTemplateId,
        title: contractTitle || undefined,
        contactId: selectedContactId || undefined,
        accountId: selectedAccountId || undefined,
        dealId: selectedDealId || undefined,
        folderId: contractFolderId || undefined,
        folderPath: contractFolderPath || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat genere depuis le modele avec pre-remplissage');
      setShowCreateContractForm(false);
      setContractTitle('');
      setContractFolderPath('');
    },
    onError: () => toast.error('Generation du contrat impossible'),
  });

  const markToModify = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/mark-to-modify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat passe au statut "A modifier"');
    },
    onError: () => toast.error('Action impossible'),
  });

  const moveContractFolder = useMutation({
    mutationFn: ({ contractId, folderId }: { contractId: string; folderId?: string }) =>
      api.post(`/contracts/${contractId}/move-folder`, { folderId: folderId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat deplace');
    },
    onError: () => toast.error('Deplacement impossible'),
  });

  const createDefaultFolders = useMutation({
    mutationFn: async () => {
      const roots = (await Promise.all([
        api.post('/contracts/folders', { name: 'Brouillon' }),
        api.post('/contracts/folders', { name: 'Valide' }),
        api.post('/contracts/folders', { name: 'A modifier' }),
      ])) as unknown as Array<{ id: string }>;
      const draftRoot = roots[0];
      await Promise.all([
        api.post('/contracts/folders', { name: 'Plateforme de formation', parentId: draftRoot.id }),
        api.post('/contracts/folders', { name: 'Creation application/site', parentId: draftRoot.id }),
        api.post('/contracts/folders', { name: 'Conseil', parentId: draftRoot.id }),
        api.post('/contracts/folders', { name: 'Sensibilisation/Formation IA', parentId: draftRoot.id }),
        api.post('/contracts/folders', { name: 'Autre', parentId: draftRoot.id }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'folders'] });
      toast.success('Dossiers standards crees');
    },
    onError: () => toast.error('Certains dossiers existent deja (ou creation impossible)'),
  });

  const runAutoReminders = useMutation({
    mutationFn: () => api.post('/contracts/events/run-auto-reminders'),
    onSuccess: (result: unknown) => {
      const typed = result as { remindersSent?: number };
      queryClient.invalidateQueries({ queryKey: ['contracts', 'timeline-events'] });
      toast.success(
        typed?.remindersSent != null
          ? `Relances automatiques executees (${typed.remindersSent} envoyee(s))`
          : 'Relances automatiques executees',
      );
    },
    onError: () => toast.error('Execution des relances automatiques impossible'),
  });

  const remindByEnvelope = useMutation({
    mutationFn: () =>
      api.post('/contracts/remind-signature-by-envelope', {
        providerEnvelopeId: envelopeReminderId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'timeline-events'] });
      toast.success('Relance envoyee par envelopeId');
      setEnvelopeReminderId('');
    },
    onError: () => toast.error('Relance par envelopeId impossible'),
  });

  const updateProviderStatus = useMutation({
    mutationFn: ({ contractId, status }: { contractId: string; status: 'requested' | 'viewed' | 'declined' | 'failed' }) =>
      api.post(`/contracts/${contractId}/provider-status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'timeline-events'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'audit'] });
      toast.success('Statut provider mis a jour');
    },
    onError: () => toast.error('Mise a jour provider impossible'),
  });

  const testProductionWebhook = useMutation({
    mutationFn: () =>
      api.post('/contracts/ops/test-webhook', {
        channel: webhookTestChannel,
      }),
    onSuccess: () => toast.success('Webhook de test envoye'),
    onError: () => toast.error('Test webhook impossible'),
  });

  const patchContractsRunbook = useMutation({
    mutationFn: (steps: Record<string, boolean>) =>
      api.patch('/contracts/ops/readiness/runbook', { steps }) as Promise<ReadinessResponse>,
    onSuccess: (fresh) => {
      queryClient.setQueryData(['contracts', 'ops-readiness'], fresh);
      toast.success('Runbook enregistre');
    },
    onError: () => toast.error('Sauvegarde du runbook impossible'),
  });

  const contracts = data?.data ?? [];
  const contactOptions = contactsRes?.data ?? [];
  const accountOptions = accountsRes?.data ?? [];
  const dealOptions = dealsRes?.data ?? [];
  const templatesOptions = useMemo(() => templates ?? [], [templates]);
  const folderOptions = useMemo(() => folders ?? [], [folders]);
  const timelineEvents = useMemo(() => timelineRes?.data ?? [], [timelineRes]);
  const selectedTemplate = useMemo(
    () => templatesOptions.find((tpl) => tpl.id === selectedTemplateId) ?? null,
    [templatesOptions, selectedTemplateId],
  );

  const folderLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folderOptions) {
      const parent = folder.parentId ? folderOptions.find((f) => f.id === folder.parentId) : undefined;
      map.set(folder.id, parent ? `${parent.name} / ${folder.name}` : folder.name);
    }
    return map;
  }, [folderOptions]);

  const rootFolders = useMemo(() => folderOptions.filter((folder) => !folder.parentId), [folderOptions]);
  const childrenByParentId = useMemo(() => {
    const map = new Map<string, Folder[]>();
    for (const folder of folderOptions) {
      if (!folder.parentId) continue;
      const current = map.get(folder.parentId) ?? [];
      current.push(folder);
      map.set(folder.parentId, current);
    }
    return map;
  }, [folderOptions]);

  const openEventEntity = async (event: ContractEvent) => {
    if (event.entityType === 'contract' && event.contractId) {
      setFocusedContractId(event.contractId);
      const row = document.getElementById(`contract-row-${event.contractId}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!row) {
        toast.info('Contrat hors pagination courante. Affinez la recherche ou les filtres.');
      }
      return;
    }

    if (event.entityType === 'document') {
      try {
        const res = (await api.get(`/documents/${event.entityId}/signed-url`)) as { url: string };
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Ouverture du document impossible');
      }
      return;
    }

    toast.info('Entite non ouvrable directement pour cet evenement.');
  };

  const exportTimelineCsv = () => {
    if (timelineEvents.length === 0) {
      toast.info('Aucun evenement a exporter');
      return;
    }

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = ['timestamp', 'kind', 'entityType', 'entityId', 'contractId', 'contactId', 'title', 'description'];
    const lines = [headers.join(',')];
    for (const event of timelineEvents) {
      lines.push(
        [
          event.timestamp,
          event.kind,
          event.entityType,
          event.entityId,
          event.contractId ?? '',
          event.contactId ?? '',
          event.title,
          event.description ?? '',
        ]
          .map(escapeCsv)
          .join(','),
      );
    }

    const csv = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `timeline-contracts-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV genere');
  };

  const exportOpenedAuditJson = async () => {
    if (!openedAuditContractId) return;
    try {
      const result = (await api.get(`/contracts/${openedAuditContractId}/audit/export`)) as {
        filename: string;
        data: unknown;
      };
      const content = JSON.stringify(result.data, null, 2);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename || `contract-audit-${openedAuditContractId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Audit exporte en JSON');
    } catch {
      toast.error('Export audit impossible');
    }
  };

  const exportOpenedAuditPdf = async () => {
    if (!openedAuditContractId) return;
    try {
      const result = (await api.get(`/contracts/${openedAuditContractId}/audit/export-pdf`)) as {
        filename: string;
        mimeType: string;
        contentBase64: string;
      };
      const binary = window.atob(result.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeType || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename || `contract-audit-${openedAuditContractId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Audit exporte en PDF');
    } catch {
      toast.error('Export PDF impossible');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCreateContractForm((v) => !v)}
          className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground"
        >
          Nouveau contrat (modele)
        </button>
        <button
          type="button"
          onClick={() => setShowTemplateForm((v) => !v)}
          className="px-3 py-2 text-sm rounded-lg border"
        >
          Nouveau modele
        </button>
        <button
          type="button"
          onClick={() => setShowFolderForm((v) => !v)}
          className="px-3 py-2 text-sm rounded-lg border"
        >
          Nouveau dossier
        </button>
      </div>

      {showFolderForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Creer un dossier / sous-dossier</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="px-3 py-2 rounded-lg border bg-background"
              placeholder="Nom du dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
            >
              <option value="">Dossier parent (optionnel)</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folderLabelById.get(folder.id) || folder.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => createFolder.mutate()}
              disabled={!folderName.trim() || createFolder.isPending}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              Creer
            </button>
          </div>
        </div>
      )}

      {showTemplateForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Modele de contrat par activite</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="px-3 py-2 rounded-lg border bg-background"
              placeholder="Titre du modele"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={templateActivityType}
              onChange={(e) => setTemplateActivityType(e.target.value)}
            >
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border bg-background"
            placeholder="Description (optionnel)"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
            rows={10}
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Variables supportees: {'{{contact.fullName}}'}, {'{{account.name}}'}, {'{{deal.title}}'}, {'{{organization.name}}'}, {'{{date.today}}'}.
          </p>
          <button
            type="button"
            onClick={() => createTemplate.mutate()}
            disabled={!templateTitle.trim() || !templateContent.trim() || createTemplate.isPending}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            Enregistrer le modele
          </button>
        </div>
      )}

      <QuoteTemplatesPanel />

      {showCreateContractForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Generer un contrat type pre-rempli</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Choisir un modele</option>
              {templatesOptions.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title} - {ACTIVITY_LABELS[tpl.activityType] ?? tpl.activityType}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
            >
              <option value="">Contact signataire</option>
              {contactOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">Entreprise/partenaire</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
            >
              <option value="">Deal (optionnel)</option>
              {dealOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border bg-background"
              value={contractFolderId}
              onChange={(e) => setContractFolderId(e.target.value)}
            >
              <option value="">Dossier (optionnel)</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folderLabelById.get(folder.id) || folder.name}
                </option>
              ))}
            </select>
            <input
              className="px-3 py-2 rounded-lg border bg-background"
              placeholder="Sous-chemin libre (optionnel)"
              value={contractFolderPath}
              onChange={(e) => setContractFolderPath(e.target.value)}
            />
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border bg-background"
            placeholder="Titre du contrat (optionnel, sinon titre du modele)"
            value={contractTitle}
            onChange={(e) => setContractTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={() => createContractFromTemplate.mutate()}
            disabled={!selectedTemplateId || createContractFromTemplate.isPending}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            Creer le contrat
          </button>
          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <p className="text-sm font-medium">Apercu du modele selectionne</p>
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.title} - {ACTIVITY_LABELS[selectedTemplate.activityType] ?? selectedTemplate.activityType}
              </p>
              <pre className="text-xs whitespace-pre-wrap font-mono max-h-44 overflow-auto">
                {selectedTemplate.content}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <p className="text-sm font-medium">Smart folders</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button className="px-2 py-1 rounded border" onClick={() => setStatusFilter('draft')} type="button">
                Brouillon
              </button>
              <button className="px-2 py-1 rounded border" onClick={() => setStatusFilter('to_modify')} type="button">
                A modifier
              </button>
              <button className="px-2 py-1 rounded border" onClick={() => setStatusFilter('signed')} type="button">
                Valide
              </button>
              <button className="px-2 py-1 rounded border" onClick={() => setStatusFilter('all')} type="button">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Arborescence dossiers</p>
              <button
                type="button"
                onClick={() => createDefaultFolders.mutate()}
                disabled={createDefaultFolders.isPending}
                className="text-xs px-2 py-1 rounded border"
              >
                Dossiers standards
              </button>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-auto">
              <button
                type="button"
                onClick={() => setFolderFilter('all')}
                className={`w-full text-left px-2 py-1 rounded text-xs ${folderFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Tous les dossiers
              </button>
              {rootFolders.map((root) => (
                <div key={root.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setFolderFilter(root.id)}
                    className={`w-full text-left px-2 py-1 rounded text-xs ${folderFilter === root.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {root.name}
                  </button>
                  {(childrenByParentId.get(root.id) ?? []).map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setFolderFilter(child.id)}
                      className={`w-full text-left px-2 py-1 rounded text-xs ml-3 ${folderFilter === child.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      - {child.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              className="w-full max-w-sm px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Rechercher un contrat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="px-3 py-2 text-sm rounded-lg border bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="to_modify">A modifier</option>
              <option value="sent_for_signature">En attente signature</option>
              <option value="signed">Valide/signe</option>
            </select>
            <select
              className="px-3 py-2 text-sm rounded-lg border bg-background"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="all">Toutes activites</option>
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 text-sm rounded-lg border bg-background"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
            >
              <option value="all">Tous dossiers</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folderLabelById.get(folder.id) || folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Mise en production assistee</p>
                <p className="text-xs text-muted-foreground">
                  Checklist signatures/ops et tests de webhooks avant bascule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['contracts', 'ops-readiness'] })}
                className="px-3 py-2 text-xs rounded-lg border"
              >
                Rafraichir diagnostic
              </button>
            </div>
            {isReadinessLoading ? (
              <p className="text-xs text-muted-foreground">Analyse de readiness...</p>
            ) : (
              <>
                <p className="text-xs">
                  Score readiness: <span className="font-medium">{readinessData?.summary.score ?? 0}</span>/
                  <span className="font-medium">{readinessData?.summary.total ?? 0}</span>{' '}
                  ({readinessData?.summary.readinessLevel ?? 'n/a'})
                </p>
                <div className="space-y-2">
                  {(readinessData?.checklist ?? []).map((item) => (
                    <div key={item.id} className="rounded-lg border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{item.label}</p>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${
                            item.status === 'pass'
                              ? 'bg-green-500/15 text-green-700'
                              : item.status === 'warn'
                                ? 'bg-amber-500/15 text-amber-700'
                                : 'bg-red-500/15 text-red-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{item.detail}</p>
                      <p className="text-[11px] mt-1">{item.recommendation}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-dashed p-3 space-y-2 mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium">Runbook E2E (manuel, sauvegarde org)</p>
                    <span className="text-[11px] text-muted-foreground">
                      {(readinessData?.runbook?.completed ?? 0)}/{readinessData?.runbook?.total ?? 0} coche(s)
                      {readinessData?.runbook?.updatedAt
                        ? ` · maj ${new Date(readinessData.runbook.updatedAt).toLocaleString('fr-FR')}`
                        : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Coches enregistrees dans <code className="bg-muted px-1 rounded">organization.settings.contractsProductionRunbook</code>.
                  </p>
                  <div className="space-y-2">
                    {(readinessData?.runbook?.steps ?? []).map((step) => (
                      <label
                        key={step.id}
                        className="flex items-start gap-2 text-[11px] cursor-pointer rounded-md p-1 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={step.checked}
                          disabled={patchContractsRunbook.isPending}
                          onChange={(e) =>
                            patchContractsRunbook.mutate({ [step.id]: e.target.checked })
                          }
                          className="mt-0.5 rounded border"
                        />
                        <span>{step.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-2 py-1 text-xs rounded border bg-background"
                value={webhookTestChannel}
                onChange={(e) =>
                  setWebhookTestChannel(
                    e.target.value as 'communication' | 'signature_request' | 'signature_signed' | 'signature_reminder',
                  )
                }
              >
                <option value="communication">Webhook communication</option>
                <option value="signature_request">Webhook signature request</option>
                <option value="signature_signed">Webhook signature signed</option>
                <option value="signature_reminder">Webhook signature reminder</option>
              </select>
              <button
                type="button"
                onClick={() => testProductionWebhook.mutate()}
                disabled={testProductionWebhook.isPending}
                className="px-3 py-1 text-xs rounded border disabled:opacity-50"
              >
                Tester webhook selectionne
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Centre d’evenements</p>
                <p className="text-xs text-muted-foreground">
                  Timeline unifiee contrats, documents, messages et notifications.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportTimelineCsv}
                  className="px-3 py-2 text-xs rounded-lg border"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => runAutoReminders.mutate()}
                  disabled={runAutoReminders.isPending}
                  className="px-3 py-2 text-xs rounded-lg border disabled:opacity-50"
                >
                  Lancer relances auto (J+3/J+7)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select
                className="px-2 py-1 text-xs rounded border bg-background"
                value={eventContractId}
                onChange={(e) => setEventContractId(e.target.value)}
              >
                <option value="all">Tous les contrats</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.title}
                  </option>
                ))}
              </select>
              <select
                className="px-2 py-1 text-xs rounded border bg-background"
                value={selectedContactId || 'all'}
                onChange={(e) => setSelectedContactId(e.target.value === 'all' ? '' : e.target.value)}
              >
                <option value="all">Tous les contacts</option>
                {contactOptions.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="px-2 py-1 text-xs rounded border bg-background min-w-[280px]"
                placeholder="Relance ciblee par providerEnvelopeId"
                value={envelopeReminderId}
                onChange={(e) => setEnvelopeReminderId(e.target.value)}
              />
              <button
                type="button"
                onClick={() => remindByEnvelope.mutate()}
                disabled={!envelopeReminderId.trim() || remindByEnvelope.isPending}
                className="px-3 py-1 text-xs rounded border disabled:opacity-50"
              >
                Relancer par envelopeId
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EVENT_SCOPE_LABELS).map(([scope, label]) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() =>
                    setEventScope(scope as 'all' | 'contracts' | 'documents' | 'messages' | 'notifications')
                  }
                  className={`px-2 py-1 rounded text-xs border ${eventScope === scope ? 'bg-primary text-primary-foreground border-primary' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="max-h-[280px] overflow-auto space-y-2">
              {isTimelineLoading ? (
                <p className="text-xs text-muted-foreground">Chargement timeline...</p>
              ) : timelineEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun evenement recent pour ce filtre.</p>
              ) : (
                timelineEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {event.kind.startsWith('provider_')
                          ? `Provider - ${PROVIDER_STATUS_LABELS[event.kind.replace('provider_', '')] ?? event.kind}`
                          : event.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">
                          {EVENT_ENTITY_LABELS[event.entityType] ?? event.entityType}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEventEntity(event)}
                          className="text-[11px] px-2 py-0.5 rounded border"
                        >
                          Ouvrir
                        </button>
                      </div>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{formatDate(event.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contrat</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Deal / Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Activite / Dossier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Montant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Aucun contrat pour l’instant
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr
                      key={c.id}
                      id={`contract-row-${c.id}`}
                      className={`hover:bg-muted/20 transition-colors ${focusedContractId === c.id ? 'bg-primary/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.title}</p>
                        {c.signedAt ? (
                          <p className="text-xs text-green-700 dark:text-green-400">Signé le {formatDate(c.signedAt)}</p>
                        ) : c.sentForSignatureAt ? (
                          <p className="text-xs text-muted-foreground">Envoyé le {formatDate(c.sentForSignatureAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {c.deal ? (
                          <Link href={`/deals/${c.deal.id}`} className="text-primary hover:underline">
                            {c.deal.title}
                          </Link>
                        ) : (
                          '—'
                        )}
                        {c.contact && (
                          <p className="text-xs">
                            {c.contact.firstName} {c.contact.lastName}
                          </p>
                        )}
                        {c.account && <p className="text-xs">{c.account.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                        {c.signatureProvider === 'external_webhook' &&
                          typeof c.signatureMetadata === 'object' &&
                          c.signatureMetadata &&
                          typeof (c.signatureMetadata as Record<string, unknown>).providerStatus === 'string' && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Provider:{' '}
                              {PROVIDER_STATUS_LABELS[
                                (c.signatureMetadata as Record<string, unknown>).providerStatus as string
                              ] ??
                                String((c.signatureMetadata as Record<string, unknown>).providerStatus)}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        <p>{ACTIVITY_LABELS[c.activityType] ?? c.activityType}</p>
                        <p>{c.folder?.name ?? c.folderPath ?? 'Sans dossier'}</p>
                        {c.template && <p>Modele: {c.template.title}</p>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {c.value != null ? formatCurrency(Number(c.value), c.currency) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {(c.status === 'draft' || c.status === 'to_modify') && (
                            <>
                              <select
                                className="px-2 py-1 text-xs rounded border bg-background"
                                value={signatureModeByContract[c.id] ?? c.signatureProvider ?? 'internal_portal'}
                                onChange={(e) =>
                                  setSignatureModeByContract((prev) => ({
                                    ...prev,
                                    [c.id]: e.target.value as 'internal_portal' | 'external_webhook',
                                  }))
                                }
                              >
                                <option value="internal_portal">Signature interne (portail)</option>
                                <option value="external_webhook">Signature externe (agrege/webhook)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  sendForSignature.mutate({
                                    id: c.id,
                                    provider: signatureModeByContract[c.id] ?? c.signatureProvider ?? 'internal_portal',
                                  })
                                }
                                disabled={sendForSignature.isPending}
                                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
                              >
                                Envoyer signature
                              </button>
                            </>
                          )}
                          <div className="flex gap-1">
                            <select
                              className="px-2 py-1 text-xs rounded border bg-background"
                              value={moveFolderByContract[c.id] ?? c.folder?.id ?? ''}
                              onChange={(e) =>
                                setMoveFolderByContract((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                            >
                              <option value="">Sans dossier</option>
                              {folderOptions.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folderLabelById.get(folder.id) || folder.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                moveContractFolder.mutate({
                                  contractId: c.id,
                                  folderId: moveFolderByContract[c.id] ?? c.folder?.id ?? '',
                                })
                              }
                              disabled={moveContractFolder.isPending}
                              className="px-2 py-1 text-xs rounded border"
                            >
                              Deplacer
                            </button>
                          </div>
                          {c.status === 'sent_for_signature' && (
                            <>
                              <button
                                type="button"
                                onClick={() => markToModify.mutate(c.id)}
                                disabled={markToModify.isPending}
                                className="px-2 py-1 text-xs rounded border"
                              >
                                Basculer a modifier
                              </button>
                              {c.signatureProvider === 'external_webhook' && (
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateProviderStatus.mutate({ contractId: c.id, status: 'viewed' })}
                                    className="px-2 py-1 text-xs rounded border"
                                  >
                                    Provider: viewed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateProviderStatus.mutate({ contractId: c.id, status: 'declined' })}
                                    className="px-2 py-1 text-xs rounded border"
                                  >
                                    Provider: declined
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateProviderStatus.mutate({ contractId: c.id, status: 'failed' })}
                                    className="px-2 py-1 text-xs rounded border"
                                  >
                                    Provider: failed
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenedAuditContractId(c.id)}
                            className="px-2 py-1 text-xs rounded border"
                          >
                            Audit
                          </button>
                          {c.status === 'signed' && <span className="text-xs text-green-700">Valide</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {openedAuditContractId && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Audit signature</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportOpenedAuditPdf}
                    className="px-2 py-1 text-xs rounded border"
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportOpenedAuditJson}
                    className="px-2 py-1 text-xs rounded border"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenedAuditContractId(null)}
                    className="px-2 py-1 text-xs rounded border"
                  >
                    Fermer
                  </button>
                </div>
              </div>
              {isAuditLoading ? (
                <p className="text-xs text-muted-foreground">Chargement audit...</p>
              ) : !openedContractAudit ? (
                <p className="text-xs text-muted-foreground">Aucune donnee d audit.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border p-3 space-y-1">
                      <p>
                        <span className="font-medium">Contrat:</span> {openedContractAudit.contract.title}
                      </p>
                      <p>
                        <span className="font-medium">Statut:</span> {STATUS_LABELS[openedContractAudit.contract.status] ?? openedContractAudit.contract.status}
                      </p>
                      <p>
                        <span className="font-medium">Provider:</span> {openedContractAudit.contract.signatureProvider}
                      </p>
                      <p>
                        <span className="font-medium">Envoye:</span>{' '}
                        {openedContractAudit.contract.sentForSignatureAt
                          ? formatDate(openedContractAudit.contract.sentForSignatureAt)
                          : '—'}
                      </p>
                      <p>
                        <span className="font-medium">Signe:</span>{' '}
                        {openedContractAudit.contract.signedAt ? formatDate(openedContractAudit.contract.signedAt) : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <p>
                        <span className="font-medium">Historique relances:</span>{' '}
                        {openedContractAudit.evidence.reminderHistory.length}
                      </p>
                      <p>
                        <span className="font-medium">Evenements provider:</span>{' '}
                        {Array.isArray(openedContractAudit.evidence.providerEventHistory)
                          ? openedContractAudit.evidence.providerEventHistory.length
                          : 0}
                      </p>
                      {openedContractAudit.evidence.providerFailureReason && (
                        <p>
                          <span className="font-medium">Cause echec:</span>{' '}
                          {openedContractAudit.evidence.providerFailureReason}
                        </p>
                      )}
                      {openedContractAudit.evidence.providerRecommendedAction && (
                        <p className="rounded border bg-muted/20 p-2">
                          <span className="font-medium">Action recommandee:</span>{' '}
                          {openedContractAudit.evidence.providerRecommendedAction}
                        </p>
                      )}
                      {!openedContractAudit.evidence.providerRecommendedAction && (
                        <p className="rounded border bg-muted/20 p-2 text-muted-foreground">
                          Aucune action recommandee immediate.
                        </p>
                      )}
                      <pre className="text-[11px] whitespace-pre-wrap max-h-40 overflow-auto">
                        {JSON.stringify(openedContractAudit.evidence.signatureMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
