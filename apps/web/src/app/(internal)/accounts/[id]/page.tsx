import type { Metadata } from 'next';
import { AccountDetail } from '@/components/crm/accounts/account-detail';

export const metadata: Metadata = { title: 'Détail entreprise' };

export default function AccountDetailPage({ params }: { params: { id: string } }) {
  return <AccountDetail accountId={params.id} />;
}
