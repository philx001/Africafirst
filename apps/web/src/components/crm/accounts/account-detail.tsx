'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Building2, Mail, Phone, Users, Handshake } from 'lucide-react';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';

interface AccountDetail {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  tags: string[];
  createdAt: string;
  contacts: { id: string; firstName: string; lastName: string; email?: string }[];
  deals: { id: string; title: string; stage: string; value?: number }[];
  _count: { contacts: number; deals: number; documents: number };
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts', accountId],
    queryFn: () => api.get(`/accounts/${accountId}`).then((r) => r as unknown as AccountDetail),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <p className="font-medium text-destructive">Entreprise introuvable ou accès refusé.</p>
        <Link href="/accounts" className="text-primary hover:underline mt-2 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Entreprises
        </Link>
        <Link
          href={`/accounts/${data.id}/edit`}
          className="text-sm px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors self-start sm:self-auto"
        >
          Modifier
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.industry || 'Secteur non renseigné'}
              {data.city || data.country
                ? ` · ${[data.city, data.country].filter(Boolean).join(', ')}`
                : ''}
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="w-4 h-4" />
                  {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="w-4 h-4" />
                  {data.phone}
                </a>
              )}
              {data.website && (
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground truncate max-w-xs"
                >
                  {data.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {data.description && (
          <p className="text-sm text-muted-foreground border-t pt-4">{data.description}</p>
        )}

        {data.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {data.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-6 text-sm border-t pt-4 text-muted-foreground">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {data._count.contacts} contacts
          </span>
          <span className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            {data._count.deals} deals
          </span>
          <span className="ml-auto text-xs">Créée le {formatDate(data.createdAt)}</span>
        </div>
      </div>

      {data.contacts.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-medium text-sm">Contacts récents</div>
          <ul className="divide-y">
            {data.contacts.map((c) => (
              <li key={c.id} className="px-4 py-3 flex justify-between gap-2 text-sm">
                <Link href={`/contacts/${c.id}`} className="font-medium hover:text-primary">
                  {c.firstName} {c.lastName}
                </Link>
                {c.email && <span className="text-muted-foreground truncate">{c.email}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <InternalDocumentsList accountId={accountId} libraryTitle="Documents de l'entreprise" />

      {data.deals.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-medium text-sm">Deals récents</div>
          <ul className="divide-y">
            {data.deals.map((d) => (
              <li key={d.id} className="px-4 py-3 flex justify-between gap-2 text-sm">
                <Link href={`/deals/${d.id}`} className="font-medium hover:text-primary">
                  {d.title}
                </Link>
                <span className="text-muted-foreground capitalize">{d.stage}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
