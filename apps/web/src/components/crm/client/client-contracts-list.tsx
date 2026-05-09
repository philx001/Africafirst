'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileSignature } from 'lucide-react';

interface ClientContract {
  id: string;
  title: string;
  status: string;
  currency: string;
  value?: number;
  sentForSignatureAt?: string;
  signedAt?: string;
  deal?: { id: string; title: string };
}

const labels: Record<string, string> = {
  sent_for_signature: 'À signer',
  signed: 'Signé',
};

export function ClientContractsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['client', 'contracts'],
    queryFn: () => api.get('/client/contracts').then((r) => r as unknown as ClientContract[]),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun contrat en attente ou signé pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {data.map((c) => (
        <Link
          key={c.id}
          href={`/client/contracts/${c.id}`}
          className="block rounded-xl border bg-card p-5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{c.title}</p>
              {c.deal && <p className="text-xs text-muted-foreground mt-1">Deal : {c.deal.title}</p>}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted whitespace-nowrap">
              {labels[c.status] ?? c.status}
            </span>
          </div>
          {c.value != null && (
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(Number(c.value), c.currency)}</p>
          )}
          {c.signedAt && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-2">Signé le {formatDate(c.signedAt)}</p>
          )}
          {c.status === 'sent_for_signature' && c.sentForSignatureAt && (
            <p className="text-xs text-muted-foreground mt-2">Reçu le {formatDate(c.sentForSignatureAt)}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
