'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';
import { Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  notes?: string | null;
  tags: string[];
  deals: Array<{ id: string; title: string; stage: string }>;
  projects: Array<{ id: string; name: string; status: string }>;
  account?: { id: string; name: string } | null;
  interactions: Array<{
    id: string;
    type: string;
    notes?: string | null;
    subject?: string | null;
    occurredAt: string;
    deal?: { id: string; title: string } | null;
    project?: { id: string; name: string } | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  }>;
}

export function ContactDetailClient({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const { data: contact, isLoading, isError } = useQuery({
    queryKey: ['contacts', contactId],
    queryFn: () => api.get(`/contacts/${contactId}`) as Promise<ContactDetail>,
  });

  const addNote = useMutation({
    mutationFn: () =>
      api.post('/interactions', {
        type: 'note',
        notes: note.trim(),
        contactId,
      }),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['contacts', contactId] });
      toast.success('Note enregistrée');
    },
    onError: () => toast.error('Impossible d’enregistrer la note'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-9 w-64 bg-muted rounded animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm max-w-3xl">
        <p className="font-medium text-destructive">Contact introuvable ou accès refusé.</p>
        <Link href="/contacts" className="text-primary hover:underline mt-2 inline-block">
          ← Contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          {contact.jobTitle && <p className="text-muted-foreground text-sm">{contact.jobTitle}</p>}
          {contact.account && (
            <p className="text-sm mt-2 flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <Link href={`/accounts/${contact.account.id}`} className="text-primary hover:underline">
                {contact.account.name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
          >
            Modifier
          </Link>
          <Link href="/contacts" className="text-sm text-primary hover:underline">
            ← Contacts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold text-sm">Coordonnées</h2>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              {contact.phone}
            </a>
          )}
          {contact.mobile && !contact.phone && (
            <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              {contact.mobile} (mobile)
            </a>
          )}
          {contact.department && <p className="text-muted-foreground">Service : {contact.department}</p>}
        </div>
        {contact.notes && (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold text-sm mb-2">Notes internes</h2>
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">{contact.notes}</p>
          </div>
        )}
      </div>

      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contact.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-muted">
              {t}
            </span>
          ))}
        </div>
      )}

      {contact.deals.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Deals récents</h2>
          <ul className="rounded-xl border divide-y bg-card">
            {contact.deals.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex justify-between gap-4 px-4 py-3 hover:bg-muted/30 text-sm">
                  <span className="font-medium">{d.title}</span>
                  <span className="text-muted-foreground capitalize">{d.stage}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {contact.projects.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Projets</h2>
          <ul className="rounded-xl border divide-y bg-card">
            {contact.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex justify-between gap-4 px-4 py-3 hover:bg-muted/30 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <InternalDocumentsList contactId={contactId} libraryTitle="Documents du contact" />

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Activité</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            className="flex-1 min-h-[80px] text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="Ajouter une note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="sm:self-end px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            disabled={!note.trim() || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            Enregistrer
          </button>
        </div>
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {contact.interactions.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucune interaction.</li>
          ) : (
            contact.interactions.map((it) => (
              <li key={it.id} className="text-sm border rounded-lg p-3 bg-muted/20">
                <div className="flex justify-between gap-2 text-xs text-muted-foreground mb-1">
                  <span className="uppercase tracking-wide">{it.type}</span>
                  <span>{formatRelative(it.occurredAt)}</span>
                </div>
                {(it.subject || it.notes) && (
                  <p className="whitespace-pre-wrap">{it.subject || it.notes}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                  {it.deal && (
                    <Link href={`/deals/${it.deal.id}`} className="text-primary hover:underline">
                      Deal : {it.deal.title}
                    </Link>
                  )}
                  {it.project && (
                    <Link href={`/projects/${it.project.id}`} className="text-primary hover:underline">
                      Projet : {it.project.name}
                    </Link>
                  )}
                  {it.user && (it.user.firstName || it.user.lastName) && (
                    <span>
                      Par {it.user.firstName ?? ''} {it.user.lastName ?? ''}
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
