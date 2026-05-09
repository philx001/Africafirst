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

export function OrgSettings({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [settingsJson, setSettingsJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', 'me'],
    queryFn: () => api.get('/organizations/me').then((r) => r as unknown as OrgMe),
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

  if (isLoading || !data) {
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
              HMAC.
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
    </div>
  );
}
