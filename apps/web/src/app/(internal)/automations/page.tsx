import type { Metadata } from 'next';
import { AutomationsList } from '@/components/crm/automations/automations-list';

export const metadata: Metadata = { title: 'Automatisations' };

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automatisations</h1>
        <p className="text-muted-foreground">Règles métier et files d&apos;exécution (BullMQ) par organisation</p>
      </div>
      <AutomationsList />
    </div>
  );
}
