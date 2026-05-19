'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS,
  DEFAULT_TICKET_SLA_RESOLUTION_HOURS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
} from '@crm/shared';

type TicketPrioritySlaKey = keyof typeof DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS;

const SLA_FIELD_META: { key: TicketPrioritySlaKey; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'Élevée' },
  { key: 'medium', label: 'Moyenne' },
  { key: 'low', label: 'Faible' },
];

function emptySlaForm(): Record<TicketPrioritySlaKey, string> {
  return { urgent: '', high: '', medium: '', low: '' };
}

function readSlaFormFromSettings(settings: Record<string, unknown> | undefined): Record<TicketPrioritySlaKey, string> {
  const form = emptySlaForm();
  if (!settings?.ticketSlaHours || typeof settings.ticketSlaHours !== 'object') return form;
  const th = settings.ticketSlaHours as Record<string, unknown>;
  for (const { key } of SLA_FIELD_META) {
    const v = th[key];
    if (typeof v === 'number') form[key] = String(v);
  }
  return form;
}

function applyTicketSlaFormToSettingsBody(
  settings: Record<string, unknown>,
  form: Record<TicketPrioritySlaKey, string>,
): string | null {
  const out: Record<string, number> = {};
  for (const { key } of SLA_FIELD_META) {
    const s = form[key].trim();
    if (s === '') continue;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 8760) {
      return `SLA première réponse (${key}) : entier entre 1 et 8760 heures, ou laisser vide pour le défaut (${DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS[key]} h).`;
    }
    out[key] = n;
  }
  if (Object.keys(out).length === 0) delete settings.ticketSlaHours;
  else settings.ticketSlaHours = out;
  return null;
}

function readResolutionSlaFormFromSettings(
  settings: Record<string, unknown> | undefined,
): Record<TicketPrioritySlaKey, string> {
  const form = emptySlaForm();
  if (!settings?.ticketResolutionSlaHours || typeof settings.ticketResolutionSlaHours !== 'object')
    return form;
  const th = settings.ticketResolutionSlaHours as Record<string, unknown>;
  for (const { key } of SLA_FIELD_META) {
    const v = th[key];
    if (typeof v === 'number') form[key] = String(v);
  }
  return form;
}

function applyTicketResolutionSlaFormToSettingsBody(
  settings: Record<string, unknown>,
  form: Record<TicketPrioritySlaKey, string>,
): string | null {
  const out: Record<string, number> = {};
  for (const { key } of SLA_FIELD_META) {
    const s = form[key].trim();
    if (s === '') continue;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 8760) {
      return `SLA résolution (${key}) : entier entre 1 et 8760 heures, ou laisser vide pour le défaut (${DEFAULT_TICKET_SLA_RESOLUTION_HOURS[key]} h).`;
    }
    out[key] = n;
  }
  if (Object.keys(out).length === 0) delete settings.ticketResolutionSlaHours;
  else settings.ticketResolutionSlaHours = out;
  return null;
}

function readAttachmentQuotaFromSettings(settings: Record<string, unknown> | undefined) {
  const mb = settings?.ticketAttachmentMaxTotalMb;
  const cnt = settings?.ticketAttachmentMaxCount;
  return {
    attachMaxMb: typeof mb === 'number' ? String(mb) : '',
    attachMaxCount: typeof cnt === 'number' ? String(cnt) : '',
  };
}

function applyTicketAttachmentQuotaToSettings(
  settings: Record<string, unknown>,
  attachMaxMbInput: string,
  attachMaxCountInput: string,
): string | null {
  const mbT = attachMaxMbInput.trim();
  const cntT = attachMaxCountInput.trim();
  if (!mbT && !cntT) {
    delete settings.ticketAttachmentMaxTotalMb;
    delete settings.ticketAttachmentMaxCount;
    return null;
  }
  if (mbT) {
    const n = Number(mbT);
    if (!Number.isInteger(n) || n < 1 || n > 5120) {
      return 'Quota pièces jointes : volume total max (Mo) entier 1–5120 ou vide pour illimité.';
    }
    settings.ticketAttachmentMaxTotalMb = n;
  } else {
    delete settings.ticketAttachmentMaxTotalMb;
  }
  if (cntT) {
    const n = Number(cntT);
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      return 'Quota pièces jointes : nombre max de fichiers entier 1–500 ou vide pour illimité.';
    }
    settings.ticketAttachmentMaxCount = n;
  } else {
    delete settings.ticketAttachmentMaxCount;
  }
  return null;
}

interface OrgMe {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  logoUrl?: string;
  createdAt: string;
  _count: { users: number; contacts: number; deals: number; projects: number };
}

interface TeamUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'admin' | 'member' | 'client';
  isActive: boolean;
}

export function OrgSettings({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [settingsJson, setSettingsJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [slaHours, setSlaHours] = useState(emptySlaForm);
  const [resolutionSlaHours, setResolutionSlaHours] = useState(emptySlaForm);
  const [attachMaxMb, setAttachMaxMb] = useState('');
  const [attachMaxCount, setAttachMaxCount] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<'EUR' | 'USD' | 'XOF'>('EUR');
  const [defaultLocale, setDefaultLocale] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'client'>('member');

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['organizations', 'me'],
    queryFn: () => api.get('/organizations/me').then((r) => r as unknown as OrgMe),
  });

  const { data: team = [] } = useQuery<TeamUser[]>({
    queryKey: ['users', 'team'],
    queryFn: () => api.get('/users').then((r) => r as unknown as TeamUser[]),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    try {
      const obj = (data.settings ?? {}) as Record<string, unknown>;
      setSettingsJson(JSON.stringify(obj, null, 2));
      setSlaHours(readSlaFormFromSettings(obj));
      setResolutionSlaHours(readResolutionSlaFormFromSettings(obj));
      const aq = readAttachmentQuotaFromSettings(obj);
      setAttachMaxMb(aq.attachMaxMb);
      setAttachMaxCount(aq.attachMaxCount);
      const loadedCurrency =
        typeof obj.defaultCurrency === 'string' &&
        (SUPPORTED_CURRENCIES as readonly string[]).includes(obj.defaultCurrency)
          ? (obj.defaultCurrency as 'EUR' | 'USD' | 'XOF')
          : 'EUR';
      const loadedLocale =
        typeof obj.defaultLocale === 'string' &&
        (SUPPORTED_LOCALES as readonly string[]).includes(obj.defaultLocale)
          ? (obj.defaultLocale as 'fr-FR' | 'en-US')
          : 'fr-FR';
      setDefaultCurrency(loadedCurrency);
      setDefaultLocale(loadedLocale);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crm:defaultCurrency', loadedCurrency);
        window.localStorage.setItem('crm:defaultLocale', loadedLocale);
      }
      setJsonError(null);
    } catch {
      setSettingsJson('{}');
      setSlaHours(emptySlaForm());
      setResolutionSlaHours(emptySlaForm());
      setAttachMaxMb('');
      setAttachMaxCount('');
      setDefaultCurrency('EUR');
      setDefaultLocale('fr-FR');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let settings: Record<string, unknown>;
      try {
        const raw = settingsJson.trim();
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('JSON : la racine doit être un objet { … }.');
          throw new Error('invalid settings root');
        }
        settings = parsed as Record<string, unknown>;
      } catch (e) {
        if (e instanceof SyntaxError) {
          setJsonError('JSON invalide pour les paramètres avancés.');
        } else if (!(e instanceof Error && e.message === 'invalid settings root')) {
          setJsonError('JSON invalide pour les paramètres avancés.');
        }
        throw e;
      }

      const slaErr = applyTicketSlaFormToSettingsBody(settings, slaHours);
      if (slaErr) {
        setJsonError(slaErr);
        throw new Error('invalid sla');
      }
      const resSlaErr = applyTicketResolutionSlaFormToSettingsBody(settings, resolutionSlaHours);
      if (resSlaErr) {
        setJsonError(resSlaErr);
        throw new Error('invalid resolution sla');
      }
      const quotaErr = applyTicketAttachmentQuotaToSettings(settings, attachMaxMb, attachMaxCount);
      if (quotaErr) {
        setJsonError(quotaErr);
        throw new Error('invalid attachment quota');
      }
      settings.defaultCurrency = defaultCurrency;
      settings.defaultLocale = defaultLocale;
      setJsonError(null);
      return api.put('/organizations/me', { name: name.trim() || undefined, settings });
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crm:defaultCurrency', defaultCurrency);
        window.localStorage.setItem('crm:defaultLocale', defaultLocale);
      }
      queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.post('/auth/invite', {
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: () => {
      setInviteEmail('');
      setInviteRole('member');
      queryClient.invalidateQueries({ queryKey: ['users', 'team'] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: TeamUser['role'] }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'team'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/deactivate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'team'] }),
  });

  if (isError) {
    const msg =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      (Array.isArray((error as { message: unknown }).message) ||
        typeof (error as { message: unknown }).message === 'string')
        ? (error as { message: string | string[] }).message
        : "Impossible de charger les paramètres de l'organisation.";
    const text = Array.isArray(msg) ? msg.join(' ') : String(msg);
    return (
      <div className="max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <p className="text-sm font-medium text-destructive">{text}</p>
        <p className="text-xs text-muted-foreground">
          Vérifiez que l’API est démarrée, que <code className="text-[11px] bg-muted px-1 rounded">NEXT_PUBLIC_API_URL</code> pointe vers la bonne URL, et que la session est valide.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Organisation</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Slug</dt>
            <dd className="font-mono text-sm">{data.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Plan</dt>
            <dd className="capitalize">{data.plan}</dd>
          </div>
        </dl>

        <div className="border-t pt-4 space-y-2">
          <label htmlFor="org-name" className="text-sm font-medium">
            Nom affiché
          </label>
          <input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">Seuls les administrateurs peuvent modifier le nom.</p>
          )}
        </div>

        {isAdmin && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold">Tickets support — SLA première réponse</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Délai cible (en heures) depuis la <span className="font-medium">création du ticket</span>, aligné sur{' '}
                <code className="text-[11px] bg-muted px-1 rounded">slaDueAt</code>. Tickets créés depuis le portail
                client utilisent la priorité moyenne — seul le champ « Moyenne » s’applique à eux. Champ vide = défaut CRM
                :{' '}
                {SLA_FIELD_META.map(({ key, label }, i) => (
                  <span key={key}>
                    {i > 0 ? ' · ' : ''}
                    {label} {DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS[key]} h
                  </span>
                ))}
                .
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SLA_FIELD_META.map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={`sla-${key}`} className="text-xs font-medium text-muted-foreground">
                    {label}
                  </label>
                  <input
                    id={`sla-${key}`}
                    inputMode="numeric"
                    placeholder={`${DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS[key]} par déf.`}
                    value={slaHours[key]}
                    onChange={(e) => setSlaHours((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background tabular-nums"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ces valeurs sont enregistrées sous <code className="bg-muted px-1 rounded">settings.ticketSlaHours</code>{' '}
              (avec le reste des paramètres au clic sur Enregistrer).
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold">Tickets support — SLA résolution</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Délai cible (en heures) depuis la <span className="font-medium">création du ticket</span> pour passer au
                statut résolu ou fermé (<code className="text-[11px] bg-muted px-1 rounded">resolutionSlaDueAt</code>
                ). Même ancrage que la SLA première réponse lors d’un changement de priorité. Champ vide = défaut CRM :{' '}
                {SLA_FIELD_META.map(({ key, label }, i) => (
                  <span key={key}>
                    {i > 0 ? ' · ' : ''}
                    {label} {DEFAULT_TICKET_SLA_RESOLUTION_HOURS[key]} h
                  </span>
                ))}
                .
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SLA_FIELD_META.map(({ key, label }) => (
                <div key={`res-${key}`}>
                  <label htmlFor={`sla-res-${key}`} className="text-xs font-medium text-muted-foreground">
                    {label}
                  </label>
                  <input
                    id={`sla-res-${key}`}
                    inputMode="numeric"
                    placeholder={`${DEFAULT_TICKET_SLA_RESOLUTION_HOURS[key]} par déf.`}
                    value={resolutionSlaHours[key]}
                    onChange={(e) =>
                      setResolutionSlaHours((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background tabular-nums"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Stocké sous{' '}
              <code className="bg-muted px-1 rounded">settings.ticketResolutionSlaHours</code>.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold">Tickets — quotas pièces jointes</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Optionnel : limite le volume total et/ou le nombre de fichiers liés à un même ticket (interne + portail).
                Laisser les deux champs vides = pas de limite (comportement historique).
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="attach-max-mb" className="text-xs font-medium text-muted-foreground">
                  Volume total max (Mo / ticket)
                </label>
                <input
                  id="attach-max-mb"
                  inputMode="numeric"
                  placeholder="Illimité"
                  value={attachMaxMb}
                  onChange={(e) => setAttachMaxMb(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="attach-max-count" className="text-xs font-medium text-muted-foreground">
                  Nombre max de fichiers / ticket
                </label>
                <input
                  id="attach-max-count"
                  inputMode="numeric"
                  placeholder="Illimité"
                  value={attachMaxCount}
                  onChange={(e) => setAttachMaxCount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background tabular-nums"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Clés JSON : <code className="bg-muted px-1 rounded">ticketAttachmentMaxTotalMb</code>,{' '}
              <code className="bg-muted px-1 rounded">ticketAttachmentMaxCount</code>.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold">Format international (P5)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Définit la devise et la locale UI par défaut du tenant (affichages montants/dates côté web).
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="default-currency" className="text-xs font-medium text-muted-foreground">
                  Devise par défaut
                </label>
                <select
                  id="default-currency"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value as 'EUR' | 'USD' | 'XOF')}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="default-locale" className="text-xs font-medium text-muted-foreground">
                  Locale par défaut
                </label>
                <select
                  id="default-locale"
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value as 'fr-FR' | 'en-US')}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-background"
                >
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Clés JSON: <code className="bg-muted px-1 rounded">defaultCurrency</code> et{' '}
              <code className="bg-muted px-1 rounded">defaultLocale</code>.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-2 border-t pt-4">
            <label htmlFor="org-settings-json" className="text-sm font-medium">
              Paramètres avancés (JSON)
            </label>
            <textarea
              id="org-settings-json"
              value={settingsJson}
              onChange={(e) => setSettingsJson(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Le délai SLA des tickets par priorité est surtout configurable via le formulaire ci-dessus (clé{' '}
              <code className="text-[11px] bg-muted px-1 rounded">ticketSlaHours</code>). Quotas PJ :{' '}
              <code className="text-[11px] bg-muted px-1 rounded">ticketAttachmentMaxTotalMb</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">ticketAttachmentMaxCount</code> (ou formulaire
              dédié). Webhook sortant « contrat signé » (optionnel) : ajoutez dans ce JSON les clés{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractSignedWebhookUrl</code> et, si besoin,{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractSignedWebhookSecret</code> pour la signature
              HMAC. Pour le mode de signature externe, ajoutez aussi{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractSignatureRequestWebhookUrl</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractSignatureRequestWebhookSecret</code>. Pour les
              relances/callbacks légaux: <code className="text-[11px] bg-muted px-1 rounded">contractSignatureReminderWebhookUrl</code>,{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractSignatureReminderWebhookSecret</code>,{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractExternalCallbackSecret</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractExternalCallbackUrl</code>. Mapping provider prêt à l’emploi:{' '}
              <code className="text-[11px] bg-muted px-1 rounded">externalSignatureProvider</code> (ex: yousign, docusign). Le callback public accepte le secret via
              payload <code className="text-[11px] bg-muted px-1 rounded">callbackSecret</code> ou header{' '}
              <code className="text-[11px] bg-muted px-1 rounded">x-callback-secret</code> et peut resoudre un contrat via{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractId</code> ou <code className="text-[11px] bg-muted px-1 rounded">providerEnvelopeId</code>.
              Pour notifications
              document/message vers outils externes: <code className="text-[11px] bg-muted px-1 rounded">communicationWebhookUrl</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">communicationWebhookSecret</code>. Le runbook E2E contrats (coches depuis la page Contrats) est stocke sous{' '}
              <code className="text-[11px] bg-muted px-1 rounded">contractsProductionRunbook</code> avec{' '}
              <code className="text-[11px] bg-muted px-1 rounded">steps</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">updatedAt</code>. Webhook deal gagne / onboarding pret
              (recommandé pour integrations externes):{' '}
              <code className="text-[11px] bg-muted px-1 rounded">dealWonWebhookUrl</code> et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">dealWonWebhookSecret</code>. Exports CSV planifies : objet{' '}
              <code className="text-[11px] bg-muted px-1 rounded">scheduledExports</code> (ex: {'{'} enabled, frequency, atHourUtc, weekdayUtc, datasets, periodDays {'}'} ; ou from/to pour une fenetre fixe). Pour desactiver la creation automatique du projet onboarding (apres signature contrat{' '}
              <span className="text-muted-foreground">ou</span> quand un deal passe en gagne depuis le pipeline)
              : <code className="text-[11px] bg-muted px-1 rounded">disableAutoOnboardingProject</code> à{' '}
              <code className="text-[11px] bg-muted px-1 rounded">true</code>. Internationalisation de base:{' '}
              <code className="text-[11px] bg-muted px-1 rounded">defaultCurrency</code> (EUR/USD/XOF) et{' '}
              <code className="text-[11px] bg-muted px-1 rounded">defaultLocale</code> (fr-FR/en-US).
            </p>
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end border-t pt-4">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Aperçu du tenant</h2>
        <p className="text-sm text-muted-foreground">Effectifs et entités rattachés à votre organisation.</p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <li className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground text-xs block">Utilisateurs</span>
            <span className="text-lg font-semibold">{data._count.users}</span>
          </li>
          <li className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground text-xs block">Contacts</span>
            <span className="text-lg font-semibold">{data._count.contacts}</span>
          </li>
          <li className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground text-xs block">Deals</span>
            <span className="text-lg font-semibold">{data._count.deals}</span>
          </li>
          <li className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground text-xs block">Projets</span>
            <span className="text-lg font-semibold">{data._count.projects}</span>
          </li>
        </ul>
      </div>

      {isAdmin && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Équipe</h2>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2">
            <input
              type="email"
              placeholder="email@domaine.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border bg-background"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'client')}
              className="px-3 py-2 text-sm rounded-lg border bg-background"
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </select>
            <button
              type="button"
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              Inviter
            </button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Utilisateur</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rôle</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">État</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {team.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          changeRoleMutation.mutate({
                            id: user.id,
                            role: e.target.value as TeamUser['role'],
                          })
                        }
                        className="px-2 py-1 text-xs rounded border bg-background"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Membre</option>
                        <option value="client">Client</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!user.isActive || deactivateMutation.isPending}
                        onClick={() => deactivateMutation.mutate(user.id)}
                        className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-50"
                      >
                        Désactiver
                      </button>
                    </td>
                  </tr>
                ))}
                {team.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
