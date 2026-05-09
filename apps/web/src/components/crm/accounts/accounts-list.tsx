'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Building2, Users, Handshake } from 'lucide-react';

interface AccountRow {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  country?: string;
  website?: string;
  email?: string;
  createdAt: string;
  _count: { contacts: number; deals: number };
}

type Paginated<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

export function AccountsList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', { page, search }],
    queryFn: () =>
      api
        .get<Paginated<AccountRow>>(
          `/accounts?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        )
        .then((r) => r as unknown as Paginated<AccountRow>),
    placeholderData: (prev) => prev,
  });

  const accounts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entreprise</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Secteur</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Localisation</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contacts / Deals</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Créée le</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? `Aucun résultat pour « ${search} »` : "Aucune entreprise pour l'instant"}
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/accounts/${account.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium group-hover:text-primary transition-colors truncate">{account.name}</p>
                        {account.website && (
                          <p className="text-xs text-muted-foreground truncate">{account.website}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{account.industry || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {[account.city, account.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {account._count.contacts}
                      </span>
                      <span className="flex items-center gap-1">
                        <Handshake className="w-3.5 h-3.5" />
                        {account._count.deals}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                    {formatDate(account.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>
              {meta.total} entreprise{meta.total > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Précédent
              </button>
              <span className="px-3 py-1">
                {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1 rounded-lg border disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
