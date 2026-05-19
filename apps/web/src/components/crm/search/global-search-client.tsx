'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
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

type SearchCategory = keyof SearchPayload | 'all';

const categoryLabels: Record<SearchCategory, string> = {
  all: 'Tout',
  contacts: 'Contacts',
  accounts: 'Entreprises',
  deals: 'Deals',
  projects: 'Projets',
  tasks: 'Tâches',
};

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
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}`) as Promise<SearchPayload>,
    enabled: q.length >= 2,
  });

  const categoryCounts = useMemo(() => {
    if (!data) return null;
    return {
      all:
        data.contacts.length +
        data.accounts.length +
        data.deals.length +
        data.projects.length +
        data.tasks.length,
      contacts: data.contacts.length,
      accounts: data.accounts.length,
      deals: data.deals.length,
      projects: data.projects.length,
      tasks: data.tasks.length,
    } satisfies Record<SearchCategory, number>;
  }, [data]);

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

  const showCategory = (category: SearchCategory) =>
    activeCategory === 'all' || activeCategory === category;

  return (
    <div className="space-y-8">
      {isFetching && <p className="text-sm text-muted-foreground">Recherche…</p>}
      {data && empty && !isFetching && (
        <p className="text-sm text-muted-foreground">Aucun résultat pour « {q} ».</p>
      )}
      {data && !empty && (
        <div className="space-y-8">
          {categoryCounts && (
            <div className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(categoryLabels) as SearchCategory[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      activeCategory === category
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    ].join(' ')}
                  >
                    {categoryLabels[category]} ({categoryCounts[category]})
                  </button>
                ))}
              </div>
            </div>
          )}
          {showCategory('contacts') && (
            <Section title="Contacts" hrefPrefix="/contacts" items={data.contacts}>
              {(c) => (
                <span className="text-sm">
                  {c.firstName} {c.lastName}
                  {c.email && <span className="text-muted-foreground"> — {c.email}</span>}
                </span>
              )}
            </Section>
          )}
          {showCategory('accounts') && (
            <Section title="Entreprises" hrefPrefix="/accounts" items={data.accounts}>
              {(a) => <span className="text-sm">{a.name}</span>}
            </Section>
          )}
          {showCategory('deals') && (
            <Section title="Deals" hrefPrefix="/deals" items={data.deals}>
              {(d) => (
                <span className="text-sm">
                  {d.title} <span className="text-muted-foreground text-xs capitalize">({d.stage})</span>
                </span>
              )}
            </Section>
          )}
          {showCategory('projects') && (
            <Section title="Projets" hrefPrefix="/projects" items={data.projects}>
              {(p) => (
                <span className="text-sm">
                  {p.name} <span className="text-muted-foreground text-xs">({p.status})</span>
                </span>
              )}
            </Section>
          )}
          {showCategory('tasks') && (
            <Section title="Tâches" hrefPrefix="/tasks" items={data.tasks}>
              {(t) => (
                <span className="text-sm">
                  {t.title} <span className="text-muted-foreground text-xs">({t.status})</span>
                </span>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
