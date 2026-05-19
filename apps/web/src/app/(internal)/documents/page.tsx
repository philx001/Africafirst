import type { Metadata } from 'next';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centre documentaire</h1>
        <p className="text-muted-foreground max-w-3xl">
          Hub des pièces du tenant (Supabase Storage). Les envois depuis une fiche deal, projet, contact, entreprise ou
          ticket sont liés à ce contexte ; la recherche serveur et les filtres avancés (MIME, période, tri, type de
          rattachement) couvrent aussi ces identifiants. Sur les fiches deal et projet, l’activité et les documents
          apparaissent aussi dans la timeline « Activité & historique ».
        </p>
      </div>
      <InternalDocumentsList />
    </div>
  );
}
