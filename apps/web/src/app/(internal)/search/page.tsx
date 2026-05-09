import type { Metadata } from 'next';
import { GlobalSearchClient } from '@/components/crm/search/global-search-client';

export const metadata: Metadata = { title: 'Recherche' };

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recherche</h1>
        <p className="text-muted-foreground text-sm">Contacts, comptes, deals, projets et tâches.</p>
      </div>
      <GlobalSearchClient />
    </div>
  );
}
