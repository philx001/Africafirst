import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardStats } from '@/components/crm/dashboard/dashboard-stats';
import { DashboardExports } from '@/components/crm/dashboard/dashboard-exports';
import { RecentDeals } from '@/components/crm/dashboard/recent-deals';
import { RecentTasks } from '@/components/crm/dashboard/recent-tasks';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>
      <DashboardStats />
      <DashboardExports />
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { href: '/contacts/new', label: 'Nouveau contact' },
            { href: '/accounts/new', label: 'Nouvelle entreprise' },
            { href: '/deals', label: 'Nouveau deal' },
            { href: '/tasks', label: 'Nouvelle tâche' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors text-center"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentDeals />
        <RecentTasks />
      </div>
    </div>
  );
}
