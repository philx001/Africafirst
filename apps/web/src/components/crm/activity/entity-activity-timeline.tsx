'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import type { InteractionType } from '@crm/shared';
import { toast } from 'sonner';
import { Download, FileText, MessageSquare } from 'lucide-react';

const INTERACTION_LABELS: Record<InteractionType, string> = {
  email: 'E-mail',
  call: 'Appel',
  meeting: 'Réunion',
  note: 'Note',
};

interface InteractionRow {
  id: string;
  type: InteractionType;
  subject?: string | null;
  notes?: string | null;
  occurredAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

interface DocRow {
  id: string;
  filename: string;
  createdAt: string;
}

type TimelineEntry =
  | { kind: 'interaction'; sortAt: number; id: string; payload: InteractionRow }
  | { kind: 'document'; sortAt: number; id: string; payload: DocRow };

type TimelineVariant =
  | { mode: 'deal'; dealId: string; contactId?: string | null }
  | { mode: 'project'; projectId: string; contactId?: string | null; linkedDealId?: string | null };

export function EntityActivityTimeline({ variant }: { variant: TimelineVariant }) {
  const qc = useQueryClient();
  const [interactionType, setInteractionType] = useState<InteractionType>('note');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');

  const dealId = variant.mode === 'deal' ? variant.dealId : undefined;
  const projectId = variant.mode === 'project' ? variant.projectId : undefined;
  const contactId = variant.contactId ?? undefined;
  const linkedDealId = variant.mode === 'project' ? variant.linkedDealId ?? undefined : undefined;

  const interactionQueryUrl =
    variant.mode === 'deal'
      ? `/interactions?dealId=${encodeURIComponent(variant.dealId)}&limit=50`
      : `/interactions?projectId=${encodeURIComponent(variant.projectId)}&limit=50`;

  const documentsQueryUrl =
    variant.mode === 'deal'
      ? `/documents?dealId=${encodeURIComponent(variant.dealId)}`
      : `/documents?projectId=${encodeURIComponent(variant.projectId)}`;

  const { data: interactions = [], isFetching: ixLoading } = useQuery({
    queryKey: ['interactions', 'timeline', variant],
    queryFn: async () => {
      const r = (await api.get(interactionQueryUrl)) as { data: InteractionRow[] };
      return r.data;
    },
    enabled: Boolean(dealId || projectId),
  });

  const { data: docs = [], isFetching: docLoading } = useQuery({
    queryKey: ['documents', 'timeline', variant],
    queryFn: () => api.get(documentsQueryUrl) as Promise<DocRow[]>,
    enabled: Boolean(dealId || projectId),
  });

  const merged = useMemo(() => {
    const items: TimelineEntry[] = [];
    for (const it of interactions) {
      items.push({
        kind: 'interaction',
        id: `i-${it.id}`,
        sortAt: new Date(it.occurredAt).getTime(),
        payload: it,
      });
    }
    for (const d of docs) {
      items.push({
        kind: 'document',
        id: `d-${d.id}`,
        sortAt: new Date(d.createdAt).getTime(),
        payload: d,
      });
    }
    return items.sort((a, b) => b.sortAt - a.sortAt);
  }, [interactions, docs]);

  const addInteraction = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        type: interactionType,
        notes: notes.trim(),
      };
      if (subject.trim()) body.subject = subject.trim();
      if (contactId) body.contactId = contactId;

      if (variant.mode === 'deal') {
        body.dealId = variant.dealId;
      } else {
        body.projectId = variant.projectId;
        if (linkedDealId) body.dealId = linkedDealId;
      }

      return api.post('/interactions', body);
    },
    onSuccess: () => {
      setNotes('');
      setSubject('');
      qc.invalidateQueries({ queryKey: ['interactions', 'timeline', variant] });
      toast.success('Activité enregistrée');
    },
    onError: () => toast.error('Impossible d’enregistrer'),
  });

  const openDoc = async (id: string) => {
    try {
      const res = (await api.get(`/documents/${id}/signed-url`)) as { url: string };
      if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Téléchargement impossible');
    }
  };

  const loading = ixLoading || docLoading;

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            Activité & historique
          </h2>
          <p className="text-xs text-muted-foreground">
            Interactions enregistrées et pièces jointes liées à cette fiche (ordre chronologique).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,140px)_1fr]">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={interactionType}
            onChange={(e) => setInteractionType(e.target.value as InteractionType)}
            className="mt-1 w-full text-sm rounded-lg border bg-background px-2 py-2"
          >
            {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map((t) => (
              <option key={t} value={t}>
                {INTERACTION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Objet (optionnel)</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Réunion export, mail de suivi…"
            className="mt-1 w-full text-sm rounded-lg border bg-background px-3 py-2"
          />
        </div>
      </div>

      <textarea
        className="w-full min-h-[88px] text-sm rounded-lg border bg-background px-3 py-2"
        placeholder="Compte rendu, prochaines actions, éléments techniques…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        type="button"
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        disabled={!notes.trim() || addInteraction.isPending}
        onClick={() => addInteraction.mutate()}
      >
        Enregistrer l’interaction
      </button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement de l’historique…</p>
      ) : merged.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/20">
          Aucune activité ni document lié encore.
        </p>
      ) : (
        <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1 border rounded-lg divide-y bg-muted/10">
          {merged.map((entry) =>
            entry.kind === 'interaction' ? (
              <li key={entry.id} className="p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium uppercase tracking-wide text-foreground">
                    {INTERACTION_LABELS[entry.payload.type]}
                  </span>
                  <span title={formatDate(entry.payload.occurredAt)}>{formatRelative(entry.payload.occurredAt)}</span>
                </div>
                {entry.payload.subject && (
                  <p className="font-medium text-sm mb-1">{entry.payload.subject}</p>
                )}
                {entry.payload.notes && <p className="whitespace-pre-wrap text-muted-foreground">{entry.payload.notes}</p>}
                {entry.payload.user && (entry.payload.user.firstName || entry.payload.user.lastName) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Par {entry.payload.user.firstName ?? ''} {entry.payload.user.lastName ?? ''}
                  </p>
                )}
              </li>
            ) : (
              <li key={entry.id} className="p-4 text-sm flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.payload.filename}</p>
                    <p className="text-xs text-muted-foreground">Document ajouté · {formatRelative(entry.payload.createdAt)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openDoc(entry.payload.id)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-muted shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ouvrir
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
