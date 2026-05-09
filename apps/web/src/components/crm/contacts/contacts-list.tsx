'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getInitials, formatDate } from '@/lib/utils';
import { Search, UserPlus, Mail, Phone } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  tags: string[];
  createdAt: string;
  account?: { id: string; name: string };
}

export function ContactsList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, search }],
    queryFn: () =>
      api
        .get(`/contacts?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
        .then((r: unknown) => r as { data: Contact[]; meta: { total: number; totalPages: number } }),
    placeholderData: (prev) => prev,
  });

  const contacts = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Link
          href="/contacts/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau contact
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Entreprise</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Coordonnées</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Tags</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Ajouté le</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 col-span-5">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? `Aucun résultat pour "${search}"` : "Aucun contact pour l'instant"}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {getInitials(contact.firstName, contact.lastName)}
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.jobTitle && (
                          <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {contact.account?.name || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="space-y-0.5">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                    {formatDate(contact.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{meta.total} contact{meta.total > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Précédent
              </button>
              <span className="px-3 py-1">{page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
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
