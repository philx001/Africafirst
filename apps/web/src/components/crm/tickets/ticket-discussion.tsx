'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { UserRole } from '@crm/shared';

/** Aligné sur `ticket-mention.helper.ts` (API). */
const TICKET_EMAIL_MENTION =
  /@([a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,})/g;

function TicketCommentBody({ body }: { body: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let mk = 0;
  for (const m of body.matchAll(TICKET_EMAIL_MENTION)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(body.slice(last, idx));
    nodes.push(
      <mark
        key={`m-${mk++}`}
        className="bg-primary/15 text-primary font-medium rounded px-0.5 not-italic"
      >
        @{m[1]}
      </mark>,
    );
    last = idx + m[0].length;
  }
  if (last < body.length) nodes.push(body.slice(last));
  return <span className="whitespace-pre-wrap text-muted-foreground">{nodes}</span>;
}

export interface TicketCommentRow {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    role: UserRole;
  };
}

export interface TicketAttachmentRow {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
}

function roleLabel(role: UserRole) {
  if (role === 'client') return 'Client';
  if (role === 'admin') return 'Admin';
  return 'Équipe';
}

export function TicketDiscussion({
  ticketId,
  mode,
  comments,
  attachments,
}: {
  ticketId: string;
  mode: 'internal' | 'client';
  comments: TicketCommentRow[];
  attachments: TicketAttachmentRow[];
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const queryKey = mode === 'internal' ? ['tickets', ticketId] : ['client', 'tickets', ticketId];

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(
        mode === 'internal' ? `/tickets/${ticketId}/comments` : `/client/tickets/${ticketId}/comments`,
        { body },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setText('');
      toast.success('Message envoyé');
    },
    onError: () => toast.error('Envoi impossible'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const path =
        mode === 'internal' ? `/tickets/${ticketId}/attachments` : `/client/tickets/${ticketId}/attachments`;
      return api.post(path, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Fichier envoyé');
    },
    onError: () => toast.error('Upload impossible'),
  });

  const openAttachment = async (docId: string) => {
    try {
      const path =
        mode === 'internal'
          ? `/documents/${docId}/signed-url`
          : `/client/documents/${docId}/signed-url`;
      const res = (await api.get(path)) as { url: string };
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Téléchargement impossible');
    }
  };

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6">
      <h2 className="text-sm font-semibold">Discussion</h2>
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="text-sm border-l-2 border-muted pl-3">
            <div className="flex flex-wrap gap-x-2 gap-y-0 text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">
                {[c.author.firstName, c.author.lastName].filter(Boolean).join(' ') || 'Utilisateur'}
              </span>
              <span>({roleLabel(c.author.role)})</span>
              <span>·</span>
              <span>{formatDate(c.createdAt)}</span>
            </div>
            <TicketCommentBody body={c.body} />
          </li>
        ))}
        {comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">Aucun message pour le moment.</li>
        ) : null}
      </ul>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Pièces jointes</p>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun fichier.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openAttachment(a.id)}
                  className="text-xs px-2 py-1 rounded-md border hover:bg-muted transition-colors"
                >
                  {a.filename}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          type="file"
          className="block text-xs w-full max-w-sm"
          disabled={uploadMutation.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) uploadMutation.mutate(f);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`ticket-reply-${ticketId}`} className="text-xs font-medium">
          Ajouter un message
        </label>
        <textarea
          id={`ticket-reply-${ticketId}`}
          rows={4}
          value={text}
          disabled={commentMutation.isPending}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
          placeholder={
            mode === 'internal'
              ? 'Message… Astuce : @adresse.email pour notifier un collègue interne.'
              : 'Votre message…'
          }
        />
        <button
          type="button"
          disabled={commentMutation.isPending || text.trim().length === 0}
          onClick={() => commentMutation.mutate(text.trim())}
          className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
