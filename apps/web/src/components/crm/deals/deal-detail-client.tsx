'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DealContractTunnel } from '@/components/crm/deals/deal-contract-tunnel';

interface DealDetail {
  id: string;
  title: string;
  stage: string;
}

export function DealDetailClient({ dealId }: { dealId: string }) {
  const { data: deal, isLoading } = useQuery({
    queryKey: ['deals', dealId],
    queryFn: () => api.get(`/deals/${dealId}`).then((r) => r as unknown as DealDetail),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isLoading ? (
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{deal?.title ?? 'Deal'}</h1>
              <p className="text-muted-foreground text-sm capitalize">
                Étape pipeline : {deal?.stage ?? '—'}
              </p>
            </>
          )}
        </div>
        <Link href="/deals" className="text-sm text-primary hover:underline">
          ← Pipeline
        </Link>
      </div>
      <DealContractTunnel dealId={dealId} />
    </div>
  );
}
