import type { Metadata } from 'next';
import { ContactDetailClient } from '@/components/crm/contacts/contact-detail-client';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  return <ContactDetailClient contactId={params.id} />;
}
