'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DEAL_STAGES } from '@crm/shared';

interface Deal {
  id: string;
  title: string;
  stage: string;
  value?: number;
  contact?: { firstName: string; lastName: string };
  createdAt: string;
}

export function RecentDeals() {
  const { data, isLoading } = useQuery({
    queryKey: ['deals', 'recent'],
    queryFn: () => api.get('/deals?limit=5').then((r: unknown) => (r as { data: { data: Deal[] } }).data.data),
  });

  const getStageStyle = (stage: string) => {
    const found = DEAL_STAGES.find((s) => s.id === stage);
    return found?.color || '#94a3b8';
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="font-semibold">Deals récents</h2>
        <Link href="/deals" className="text-sm text-primary hover:underline">Voir tout →</Link>
      </div>
      <div className="divide-y">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex gap-3">
              <div className="h-4 bg-muted rounded animate-pulse flex-1" />
            </div>
          ))
        ) : data?.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground text-center">Aucun deal pour l'instant</p>
        ) : (
          data?.map((deal) => (
            <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getStageStyle(deal.stage) }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{deal.title}</p>
                {deal.contact && (
                  <p className="text-xs text-muted-foreground truncate">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold">{deal.value ? formatCurrency(deal.value) : '—'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(deal.createdAt)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
