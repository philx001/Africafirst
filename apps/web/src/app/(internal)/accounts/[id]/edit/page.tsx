import type { Metadata } from 'next';
import { AccountEditForm } from '@/components/crm/accounts/account-edit-form';

export const metadata: Metadata = { title: 'Modifier entreprise' };

export default function EditAccountPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifier l’entreprise</h1>
        <p className="text-muted-foreground text-sm">Mettez à jour les informations puis enregistrez.</p>
      </div>
      <AccountEditForm accountId={params.id} />
    </div>
  );
}
