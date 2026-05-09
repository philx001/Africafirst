import type { Metadata } from 'next';
import { ClientContractDetail } from '@/components/crm/client/client-contract-detail';

export const metadata: Metadata = { title: 'Détail contrat' };

export default function ClientContractPage({ params }: { params: { id: string } }) {
  return <ClientContractDetail contractId={params.id} />;
}
