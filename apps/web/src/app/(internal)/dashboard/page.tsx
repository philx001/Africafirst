import type { Metadata } from 'next';
import { DashboardStats } from '@/components/crm/dashboard/dashboard-stats';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentDeals />
        <RecentTasks />
      </div>
    </div>
  );
}
