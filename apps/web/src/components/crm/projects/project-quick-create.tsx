'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PROJECT_STATUSES } from '@crm/shared';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface DealOption {
  id: string;
  title: string;
}

export function ProjectQuickCreate() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('not_started');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');

  const { data: contactsResp } = useQuery({
    queryKey: ['contacts', 'picklist', 'project-create'],
    queryFn: () => api.get('/contacts?limit=100') as Promise<{ data: ContactOption[] }>,
  });
  const contacts = contactsResp?.data ?? [];

  const { data: dealsResp } = useQuery({
    queryKey: ['deals', 'picklist', 'project-create'],
    queryFn: () => api.get('/deals?limit=100') as Promise<{ data: DealOption[] }>,
  });
  const deals = dealsResp?.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      api.post('/projects', {
        name: name.trim(),
        status,
        ...(contactId ? { contactId } : {}),
        ...(dealId ? { dealId } : {}),
      }),
    onSuccess: () => {
      setOpen(false);
      setName('');
      setStatus('not_started');
      setContactId('');
      setDealId('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projet créé');
    },
    onError: () => toast.error('Création du projet impossible'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Nouveau projet</h2>
          <p className="text-xs text-muted-foreground">Ajout rapide pour planifier le delivery.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {open ? 'Fermer' : 'Créer un projet'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Nom du projet *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!name.trim() || create.isPending}
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
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
          >
            <option value="">Deal source (optionnel)</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
