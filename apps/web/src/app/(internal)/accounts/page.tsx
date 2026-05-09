import type { Metadata } from 'next';
import { AccountsList } from '@/components/crm/accounts/accounts-list';

export const metadata: Metadata = { title: 'Entreprises' };

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
        <p className="text-muted-foreground">Comptes clients et organisations liés à votre pipeline</p>
      </div>
      <AccountsList />
    </div>
  );
}
