import type { Metadata } from 'next';
import { ContractsList } from '@/components/crm/contracts/contracts-list';

export const metadata: Metadata = { title: 'Contrats' };

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contrats & signatures</h1>
        <p className="text-muted-foreground">
          Suivez les contrats générés depuis les deals et déclenchez l’envoi à signature.
        </p>
      </div>
      <ContractsList />
    </div>
  );
}
