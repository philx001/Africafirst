'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Ticket } from 'lucide-react';
import { TICKET_STATUSES, type TicketStatus } from '@crm/shared';

interface TicketRow {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  priority: string;
  category: string;
  createdAt: string;
  contact?: { firstName?: string; lastName?: string };
  project?: { id: string; name: string };
  assignee?: { firstName?: string; lastName?: string };
}

type Paginated<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const STATUS_FILTER: Array<{ id: TicketStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Tous' },
  ...TICKET_STATUSES.map((s) => ({ id: s.id as TicketStatus, label: s.label })),
];

function statusLabel(id: TicketStatus) {
  return TICKET_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function TicketsList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { page, search, statusFilter }],
    queryFn: () => {
      const st = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const searchQ = search ? `&search=${encodeURIComponent(search)}` : '';
      return api
        .get(`/tickets?page=${page}&limit=30${st}${searchQ}`)
        .then((r) => r as unknown as Paginated<TicketRow>);
    },
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as TicketStatus | 'all');
          }}
          className="px-3 py-2 text-sm rounded-lg border bg-background"
        >
          {STATUS_FILTER.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Projet</th>
                <th className="px-4 py-3 font-medium">Assigné</th>
                <th className="px-4 py-3 font-medium">Créé</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun ticket
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{t.ticketNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${t.id}`} className="font-medium text-primary hover:underline">
                        {t.title}
                      </Link>
                      <div className="text-xs text-muted-foreground capitalize">{t.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-muted">{statusLabel(t.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.contact ? `${t.contact.firstName ?? ''} ${t.contact.lastName ?? ''}`.trim() : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.assignee ? `${t.assignee.firstName ?? ''} ${t.assignee.lastName ?? ''}`.trim() : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Page {meta.page} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
