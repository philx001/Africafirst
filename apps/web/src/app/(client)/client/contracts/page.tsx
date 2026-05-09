import type { Metadata } from 'next';
import { ClientContractsList } from '@/components/crm/client/client-contracts-list';

export const metadata: Metadata = { title: 'Contrats & signatures' };

export default function ClientContractsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contrats & signatures</h1>
        <p className="text-muted-foreground">
          Consultez les contrats envoyés par Africa First et signez-les depuis votre espace sécurisé.
        </p>
      </div>
      <ClientContractsList />
    </div>
  );
}
