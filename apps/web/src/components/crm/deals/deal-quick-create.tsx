'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEAL_STAGES } from '@crm/shared';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface AccountOption {
  id: string;
  name: string;
}

export function DealQuickCreate() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('lead');
  const [valueRaw, setValueRaw] = useState('');
  const [contactId, setContactId] = useState('');
  const [accountId, setAccountId] = useState('');

  const { data: contactsResp } = useQuery({
    queryKey: ['contacts', 'picklist', 'deal-create'],
    queryFn: () => api.get('/contacts?limit=100') as Promise<{ data: ContactOption[] }>,
  });
  const contacts = contactsResp?.data ?? [];

  const { data: accountsResp } = useQuery({
    queryKey: ['accounts', 'picklist', 'deal-create'],
    queryFn: () => api.get('/accounts?limit=100') as Promise<{ data: AccountOption[] }>,
  });
  const accounts = accountsResp?.data ?? [];

  const create = useMutation({
    mutationFn: () => {
      const parsedValue = valueRaw.trim() ? Number.parseFloat(valueRaw.trim()) : undefined;
      return api.post('/deals', {
        title: title.trim(),
        stage,
        ...(parsedValue !== undefined && !Number.isNaN(parsedValue) ? { value: parsedValue } : {}),
        ...(contactId ? { contactId } : {}),
        ...(accountId ? { accountId } : {}),
      });
    },
    onSuccess: (data: unknown) => {
      setTitle('');
      setStage('lead');
      setValueRaw('');
      setContactId('');
      setAccountId('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'kanban'] });
      toast.success('Deal créé');
      const oid =
        typeof data === 'object' && data !== null && 'onboardingProjectCreatedId' in data
          ? (data as { onboardingProjectCreatedId?: string }).onboardingProjectCreatedId
          : undefined;
      const createdId =
        typeof data === 'object' && data !== null && 'id' in data
          ? (data as { id?: string }).id
          : undefined;
      if (oid && createdId) {
        queryClient.invalidateQueries({ queryKey: ['projects', { dealId: createdId }] });
      }
      if (oid) toast.success('Projet d’onboarding créé pour ce deal gagné.');
    },
    onError: (err: unknown) => {
      let msg = 'Création du deal impossible';
      if (err && typeof err === 'object' && 'message' in err) {
        const m = (err as { message: unknown }).message;
        if (Array.isArray(m)) msg = m.filter(Boolean).join(' ');
        else if (typeof m === 'string' && m.trim()) msg = m;
      }
      toast.error(msg);
    },
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Nouveau deal</h2>
          <p className="text-xs text-muted-foreground">Ajout rapide directement depuis le pipeline.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {open ? 'Fermer' : 'Créer un deal'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Titre du deal *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={stage} onChange={(e) => setStage(e.target.value)}>
            {DEAL_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Montant"
            value={valueRaw}
            onChange={(e) => setValueRaw(e.target.value)}
          />
          <button
            type="button"
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {create.isPending ? 'Création…' : 'Enregistrer'}
          </button>

          <select
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Contact (optionnel)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          <select
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Entreprise (optionnelle)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
