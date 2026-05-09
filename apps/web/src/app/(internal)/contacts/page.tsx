import type { Metadata } from 'next';
import { ContactsList } from '@/components/crm/contacts/contacts-list';

export const metadata: Metadata = { title: 'Contacts' };

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">Gérez vos prospects, clients et partenaires</p>
      </div>
      <ContactsList />
    </div>
  );
}
