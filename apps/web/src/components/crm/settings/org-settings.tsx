'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
      setSettingsJson(JSON.stringify(data.settings ?? {}, null, 2));
      setJsonError(null);
    } catch {
      setSettingsJson('{}');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let settings: Record<string, unknown> | undefined;
      if (settingsJson.trim()) {
        try {
          settings = JSON.parse(settingsJson) as Record<string, unknown>;
          setJsonError(null);
        } catch {
          setJsonError('JSON invalide pour les paramètres avancés.');
          throw new Error('invalid json');
        }
      }
      return api.put('/organizations/me', { name: name.trim() || undefined, settings });
    },
    onSuccess: () => {
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
              Webhook sortant « contrat signé » (optionnel) : ajoutez dans ce JSON les clés{' '}
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
              <code className="text-[11px] bg-muted px-1 rounded">updatedAt</code>. Pour desactiver la creation
              automatique du projet onboarding apres signature contrat :{' '}
              <code className="text-[11px] bg-muted px-1 rounded">disableAutoOnboardingProject</code>{' '}
              à <code className="text-[11px] bg-muted px-1 rounded">true</code>.
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
