'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';

interface TicketDetail {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string | null;
  status: TicketStatus;
  createdAt: string;
  project?: { name: string };
}

function statusLabel(id: TicketStatus) {
  return TICKET_STATUSES.find((s) => s.id === id)?.label ?? id;
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
        <p className="text-xs text-muted-foreground">
          Besoin de préciser un point ? Écrivez via{' '}
          <Link href="/client/messages" className="text-primary underline">
            la messagerie
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
