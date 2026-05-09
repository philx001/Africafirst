import type { Metadata } from 'next';
import { ContactCreateForm } from '@/components/crm/contacts/contact-create-form';

export const metadata: Metadata = { title: 'Nouveau contact' };

export default function NewContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau contact</h1>
        <p className="text-muted-foreground text-sm">Création rapide — vous pourrez compléter la fiche ensuite.</p>
      </div>
      <ContactCreateForm />
    </div>
  );
}
