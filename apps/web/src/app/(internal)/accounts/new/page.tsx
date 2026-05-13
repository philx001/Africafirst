import type { Metadata } from 'next';
import { AccountCreateForm } from '@/components/crm/accounts/account-create-form';

export const metadata: Metadata = { title: 'Nouvelle entreprise' };

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Créer une entreprise</h1>
        <p className="text-muted-foreground">Ajoute un nouveau compte client à ton organisation.</p>
      </div>
      <AccountCreateForm />
    </div>
  );
}
