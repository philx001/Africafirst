import type { Metadata } from 'next';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Fichiers du tenant (Supabase Storage). Liaison deal / projet / contact : à affiner depuis les fiches métier.
        </p>
      </div>
      <InternalDocumentsList />
    </div>
  );
}
