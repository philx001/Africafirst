import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { OrgSettings } from '@/components/crm/settings/org-settings';

export const metadata: Metadata = { title: 'Paramètres' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.user_role;
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Organisation et préférences du tenant</p>
      </div>
      <OrgSettings isAdmin={isAdmin} />
    </div>
  );
}
