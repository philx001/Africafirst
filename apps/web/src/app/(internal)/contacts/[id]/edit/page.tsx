import type { Metadata } from 'next';
import { ContactEditForm } from '@/components/crm/contacts/contact-edit-form';

export const metadata: Metadata = { title: 'Modifier contact' };

export default function EditContactPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifier le contact</h1>
        <p className="text-muted-foreground text-sm">Mettez à jour la fiche puis enregistrez.</p>
      </div>
      <ContactEditForm contactId={params.id} />
    </div>
  );
}
