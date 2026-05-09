'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SearchPayload {
  contacts: { id: string; firstName: string; lastName: string; email?: string | null }[];
  accounts: { id: string; name: string; industry?: string | null }[];
  deals: { id: string; title: string; stage: string }[];
  projects: { id: string; name: string; status: string }[];
  tasks: { id: string; title: string; status: string }[];
}

function Section<T extends { id: string }>({
  title,
  hrefPrefix,
  items,
  children,
}: {
  title: string;
  hrefPrefix: string;
  items: T[];
  children: (item: T) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      <ul className="rounded-xl border divide-y bg-card">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`${hrefPrefix}/${item.id}`} className="block px-4 py-3 hover:bg-muted/40 transition-colors">
              {children(item)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GlobalSearchClient() {
  const searchParams = useSearchParams();
  const q = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}`) as Promise<SearchPayload>,
    enabled: q.length >= 2,
  });

  if (q.length < 2) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border bg-card px-4 py-8 text-center">
        Saisissez au moins 2 caractères (utilisez la barre de recherche ou l’URL <code className="text-xs">?q=</code>
        ).
      </p>
    );
  }

  const empty =
    data &&
    !data.contacts.length &&
    !data.accounts.length &&
    !data.deals.length &&
    !data.projects.length &&
    !data.tasks.length;

  return (
    <div className="space-y-8">
      {isFetching && <p className="text-sm text-muted-foreground">Recherche…</p>}
      {data && empty && !isFetching && (
        <p className="text-sm text-muted-foreground">Aucun résultat pour « {q} ».</p>
      )}
      {data && !empty && (
        <div className="space-y-8">
          <Section title="Contacts" hrefPrefix="/contacts" items={data.contacts}>
            {(c) => (
              <span className="text-sm">
                {c.firstName} {c.lastName}
                {c.email && <span className="text-muted-foreground"> — {c.email}</span>}
              </span>
            )}
          </Section>
          <Section title="Entreprises" hrefPrefix="/accounts" items={data.accounts}>
            {(a) => <span className="text-sm">{a.name}</span>}
          </Section>
          <Section title="Deals" hrefPrefix="/deals" items={data.deals}>
            {(d) => (
              <span className="text-sm">
                {d.title} <span className="text-muted-foreground text-xs capitalize">({d.stage})</span>
              </span>
            )}
          </Section>
          <Section title="Projets" hrefPrefix="/projects" items={data.projects}>
            {(p) => (
              <span className="text-sm">
                {p.name} <span className="text-muted-foreground text-xs">({p.status})</span>
              </span>
            )}
          </Section>
          <Section title="Tâches" hrefPrefix="/tasks" items={data.tasks}>
            {(t) => (
              <span className="text-sm">
                {t.title} <span className="text-muted-foreground text-xs">({t.status})</span>
              </span>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
