'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { Plus, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';

interface ClientTicket {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  createdAt: string;
  project?: { name: string };
}

interface ClientProject {
  id: string;
  name: string;
}

function statusLabel(id: TicketStatus) {
  return TICKET_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export default function ClientTicketsPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['client', 'tickets'],
    queryFn: () => api.get('/client/tickets') as Promise<ClientTicket[]>,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get('/client/projects') as Promise<ClientProject[]>,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/client/tickets', {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setProjectId('');
      queryClient.invalidateQueries({ queryKey: ['client', 'tickets'] });
      toast.success('Ticket ouvert');
    },
    onError: () => toast.error('Impossible de créer le ticket'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">Ouvrez un ticket ou suivez vos demandes</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plus className="w-4 h-4" />
          Nouveau ticket
        </div>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Objet"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre demande"
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background resize-y"
        />
        {projects.length > 0 ? (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
          >
            <option value="">Projet (optionnel)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending || !title.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Mes tickets</h2>
        <div className="rounded-xl border bg-card divide-y">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 h-16 animate-pulse bg-muted/40" />
            ))
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Ticket className="w-8 h-8 opacity-30" />
              Aucun ticket pour le moment
            </div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                href={`/client/tickets/${t.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="font-mono text-xs text-muted-foreground shrink-0">#{t.ticketNumber}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  {t.project ? (
                    <p className="text-xs text-muted-foreground truncate">{t.project.name}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-muted">{statusLabel(t.status)}</span>
                  <span className="text-muted-foreground">{formatRelative(t.createdAt)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
