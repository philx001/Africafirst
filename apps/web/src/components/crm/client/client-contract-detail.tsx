'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

interface ClientContractDetail {
  id: string;
  title: string;
  status: string;
  body?: string;
  currency: string;
  value?: number;
  signedAt?: string;
  deal?: { id: string; title: string };
  quote?: { id: string; title: string; reference?: string; totalAmount?: unknown; currency?: string };
  document?: { id: string; filename: string; mimeType: string };
}

export function ClientContractDetail({ contractId }: { contractId: string }) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client', 'contracts', contractId],
    queryFn: () => api.get(`/client/contracts/${contractId}`).then((r) => r as unknown as ClientContractDetail),
  });

  const sign = useMutation({
    mutationFn: () => api.post(`/client/contracts/${contractId}/sign`, { acknowledge: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'contracts'] });
      toast.success('Signature enregistrée. Merci.');
    },
    onError: () => toast.error('Signature impossible. Réessayez ou contactez votre interlocuteur.'),
  });

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse max-w-2xl" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 p-6 text-sm max-w-2xl">
        <p className="text-destructive font-medium">Contrat introuvable.</p>
        <Link href="/client/contracts" className="text-primary hover:underline mt-2 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  const canSign = data.status === 'sent_for_signature';

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/client/contracts" className="text-sm text-muted-foreground hover:text-foreground">
        ← Contrats
      </Link>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
        {data.deal && <p className="text-sm text-muted-foreground">Opportunité : {data.deal.title}</p>}
        {data.value != null && (
          <p className="text-lg font-semibold">{formatCurrency(Number(data.value), data.currency)}</p>
        )}
        {data.body && (
          <div className="prose prose-sm dark:prose-invert max-w-none border-t pt-4">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.body}</p>
          </div>
        )}
        {data.quote && (
          <p className="text-xs text-muted-foreground border-t pt-4">
            Basé sur le devis {data.quote.reference ? `« ${data.quote.reference} »` : data.quote.title}
            {data.quote.totalAmount != null &&
              ` — ${formatCurrency(Number(data.quote.totalAmount), data.quote.currency ?? data.currency)}`}
          </p>
        )}
        {data.status === 'signed' && data.signedAt && (
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Contrat signé le {formatDate(data.signedAt)}.
          </p>
        )}
      </div>

      {canSign && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
          <p className="text-sm font-medium">Signature électronique</p>
          <p className="text-sm text-muted-foreground">
            En cochant la case ci-dessous et en validant, vous acceptez le contenu de ce contrat tel qu&apos;affiché.
            Ceci constitue un engagement équivalent à une signature manuscrite dans le cadre de ce processus
            administratif (hors intégration d&apos;un prestataire de signature qualifié tiers).
          </p>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 rounded border"
            />
            <span>Je reconnais avoir pris connaissance du contrat et l&apos;accepte.</span>
          </label>
          <button
            type="button"
            disabled={!checked || sign.isPending}
            onClick={() => sign.mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {sign.isPending ? 'Enregistrement…' : 'Signer le contrat'}
          </button>
        </div>
      )}
    </div>
  );
}
