'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, TrendingUp, FolderKanban, CheckSquare, Euro, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Stats {
  totalContacts: number;
  totalDeals: number;
  wonDeals: number;
  conversionRate: number;
  totalProjects: number;
  activeTasks: number;
  totalRevenue: number;
}

const statCards = [
  { key: 'totalContacts', label: 'Contacts', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'totalDeals', label: 'Deals actifs', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { key: 'conversionRate', label: 'Taux de conversion', icon: Target, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', suffix: '%' },
  { key: 'totalProjects', label: 'Projets', icon: FolderKanban, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { key: 'activeTasks', label: 'Tâches en cours', icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { key: 'totalRevenue', label: 'Chiffre d\'affaires', icon: Euro, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', format: 'currency' },
];

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/organizations/stats') as Promise<Stats>,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map(({ key, label, icon: Icon, color, bg, suffix, format }) => {
        const value = stats?.[key as keyof Stats];
        let displayValue = '';

        if (format === 'currency') {
          displayValue = formatCurrency(Number(value));
        } else if (suffix) {
          displayValue = `${value}${suffix}`;
        } else {
          displayValue = String(value ?? 0);
        }

        return (
          <div key={key} className="rounded-xl border bg-card p-4 space-y-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{displayValue}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
