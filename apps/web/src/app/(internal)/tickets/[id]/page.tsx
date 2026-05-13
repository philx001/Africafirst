'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';
import { toast } from 'sonner';

interface TicketDetail {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: string;
  category: string;
  createdAt: string;
  contact?: { id: string; firstName?: string; lastName?: string; email?: string | null };
  project?: { id: string; name: string };
  account?: { id: string; name: string };
  assignee?: { id: string; firstName?: string; lastName?: string };
  createdBy?: { firstName?: string; lastName?: string };
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['tickets', id],
    queryFn: () => api.get(`/tickets/${id}`) as Promise<TicketDetail>,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { status?: TicketStatus }) => api.put(`/tickets/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', id] });
      toast.success('Ticket mis à jour');
    },
    onError: () => toast.error('Mise à jour impossible'),
  });

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/tickets')}
          className="p-2 rounded-lg border hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">#{ticket.ticketNumber}</p>
          <h1 className="text-2xl font-bold tracking-tight truncate">{ticket.title}</h1>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium shrink-0">Statut</label>
          <select
            value={ticket.status}
            disabled={updateMutation.isPending}
            onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
            className="px-3 py-2 text-sm rounded-lg border bg-background max-w-xs"
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {ticket.description ? (
          <div>
            <h2 className="text-sm font-medium mb-1">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Catégorie</dt>
            <dd className="capitalize">{ticket.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Priorité</dt>
            <dd>{ticket.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contact</dt>
            <dd>
              {ticket.contact ? (
                <Link className="text-primary hover:underline" href={`/contacts/${ticket.contact.id}`}>
                  {ticket.contact.firstName} {ticket.contact.lastName}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Projet</dt>
            <dd>
              {ticket.project ? (
                <Link className="text-primary hover:underline" href={`/projects/${ticket.project.id}`}>
                  {ticket.project.name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assigné</dt>
            <dd>
              {ticket.assignee ? `${ticket.assignee.firstName ?? ''} ${ticket.assignee.lastName ?? ''}`.trim() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Créé le</dt>
            <dd>{formatDate(ticket.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
