'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';
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
  createdAt: string;
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolutionSlaDueAt?: string | null;
  project?: { name: string };
  comments?: TicketCommentRow[];
  documents?: TicketAttachmentRow[];
}

function statusLabel(id: TicketStatus) {
  return TICKET_STATUSES.find((s) => s.id === id)?.label ?? id;
}

function ClientTicketSla({
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
          className={`rounded-xl border p-4 text-sm ${firstOverdue ? 'border-amber-500/50 bg-amber-500/5' : 'bg-muted/30'}`}
        >
          <p className="font-medium mb-1">Suivi réponse</p>
          {slaDueAt ? (
            <p className="text-muted-foreground">
              Engagement équipe : {formatDate(slaDueAt)}
              {firstOverdue ? ' — nous en sommes conscient, merci de votre patience.' : ''}
            </p>
          ) : null}
          {firstResponseAt ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Première réponse : {formatDate(firstResponseAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      {showRes ? (
        <div
          className={`rounded-xl border p-4 text-sm ${resOverdue ? 'border-amber-500/50 bg-amber-500/5' : 'bg-muted/30'}`}
        >
          <p className="font-medium mb-1">Traitement du dossier</p>
          {resolutionSlaDueAt ? (
            <p className="text-muted-foreground">
              Objectif de clôture : {formatDate(resolutionSlaDueAt)}
              {resOverdue ? ' — traitement toujours en cours, merci de votre patience.' : ''}
            </p>
          ) : null}
          {terminal ? (
            <p className="text-muted-foreground mt-1 text-xs">Ce ticket est résolu ou fermé.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ClientTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['client', 'tickets', id],
    queryFn: () => api.get(`/client/tickets/${id}`) as Promise<TicketDetail>,
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
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/client/tickets')}
          className="p-2 rounded-lg border hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-mono">#{ticket.ticketNumber}</p>
          <h1 className="text-2xl font-bold tracking-tight break-words">{ticket.title}</h1>
        </div>
      </div>

      <ClientTicketSla
        slaDueAt={ticket.slaDueAt}
        firstResponseAt={ticket.firstResponseAt}
        resolutionSlaDueAt={ticket.resolutionSlaDueAt}
        status={ticket.status}
      />

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 rounded-md bg-muted">{statusLabel(ticket.status)}</span>
          <span className="text-muted-foreground">{formatDate(ticket.createdAt)}</span>
          {ticket.project ? (
            <span className="text-muted-foreground">
              Projet : <span className="text-foreground">{ticket.project.name}</span>
            </span>
          ) : null}
        </div>
        {ticket.description ? (
          <div>
            <h2 className="text-sm font-medium mb-2">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>
        ) : null}
      </div>

      <TicketDiscussion ticketId={ticket.id} mode="client" comments={comments} attachments={attachments} />
    </div>
  );
}
