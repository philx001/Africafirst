'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';
import { toast } from 'sonner';
import {
  TicketDiscussion,
  type TicketAttachmentRow,
  type TicketCommentRow,
} from '@/components/crm/tickets/ticket-discussion';

interface TicketDetail {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: string;
  category: string;
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolutionSlaDueAt?: string | null;
  createdAt: string;
  contact?: { id: string; firstName?: string; lastName?: string; email?: string | null };
  project?: { id: string; name: string };
  account?: { id: string; name: string };
  assignee?: { id: string; firstName?: string; lastName?: string };
  createdBy?: { firstName?: string; lastName?: string };
  comments?: TicketCommentRow[];
  documents?: TicketAttachmentRow[];
}

function TicketSlaBanner({
  slaDueAt,
  firstResponseAt,
  resolutionSlaDueAt,
  status,
}: {
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolutionSlaDueAt?: string | null;
  status: TicketStatus;
}) {
  const terminal = status === 'resolved' || status === 'closed';
  const showFirst = Boolean(slaDueAt || firstResponseAt);
  const showRes = Boolean(resolutionSlaDueAt);
  if (!showFirst && !showRes) return null;

  const now = Date.now();
  const firstOverdue = Boolean(slaDueAt && !firstResponseAt && now > new Date(slaDueAt).getTime());
  const resOverdue = Boolean(
    resolutionSlaDueAt && !terminal && now > new Date(resolutionSlaDueAt).getTime(),
  );

  return (
    <div className="space-y-3">
      {showFirst ? (
        <div
          className={`rounded-xl border p-4 text-sm ${firstOverdue ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}`}
        >
          <p className="font-medium mb-1">SLA première réponse</p>
          {slaDueAt ? (
            <p className={firstOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Objectif : {formatDate(slaDueAt)}
              {firstOverdue ? ' — dépassé' : ''}
            </p>
          ) : null}
          {firstResponseAt ? (
            <p className="text-muted-foreground mt-1">Réponse enregistrée le : {formatDate(firstResponseAt)}</p>
          ) : null}
        </div>
      ) : null}

      {showRes ? (
        <div
          className={`rounded-xl border p-4 text-sm ${resOverdue ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}`}
        >
          <p className="font-medium mb-1">SLA résolution</p>
          {resolutionSlaDueAt ? (
            <p className={resOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Objectif : {formatDate(resolutionSlaDueAt)}
              {resOverdue ? ' — dépassé' : ''}
            </p>
          ) : null}
          {terminal ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Ticket au statut résolu ou fermé — comparer avec la date ci‑dessus pour le respect du SLA.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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

  const comments = ticket.comments ?? [];
  const attachments = ticket.documents ?? [];

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

      <TicketSlaBanner
        slaDueAt={ticket.slaDueAt}
        firstResponseAt={ticket.firstResponseAt}
        resolutionSlaDueAt={ticket.resolutionSlaDueAt}
        status={ticket.status}
      />

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

      <TicketDiscussion ticketId={ticket.id} mode="internal" comments={comments} attachments={attachments} />
    </div>
  );
}
