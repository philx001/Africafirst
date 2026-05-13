import type { Metadata } from 'next';
import { TicketsList } from '@/components/crm/tickets/tickets-list';
import { TicketQuickCreate } from '@/components/crm/tickets/ticket-quick-create';

export const metadata: Metadata = { title: 'Tickets' };

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets support</h1>
        <p className="text-muted-foreground">Demandes clients et suivi interne</p>
      </div>
      <TicketQuickCreate />
      <TicketsList />
    </div>
  );
}
