import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientSidebar } from '@/components/layout/client-sidebar';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (user.app_metadata?.user_role !== 'client') redirect('/dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ClientSidebar user={user} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
