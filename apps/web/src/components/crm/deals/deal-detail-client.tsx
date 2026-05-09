'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DealContractTunnel } from '@/components/crm/deals/deal-contract-tunnel';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';
import { OFFER_TYPES, type OfferType } from '@crm/shared';
import { toast } from 'sonner';

interface DealDetail {
  id: string;
  title: string;
  stage: string;
  offerType?: OfferType;
}

export function DealDetailClient({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const { data: deal, isLoading } = useQuery({
    queryKey: ['deals', dealId],
    queryFn: () => api.get(`/deals/${dealId}`).then((r) => r as unknown as DealDetail),
  });

  const updateOffer = useMutation({
    mutationFn: (offerType: OfferType) => api.put(`/deals/${dealId}`, { offerType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Type d\'offre enregistré');
    },
    onError: () => toast.error('Mise à jour impossible'),
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

      <div className="rounded-xl border bg-card p-4 max-w-xl">
        <label htmlFor="deal-offer-type" className="text-sm font-medium block mb-2">
          Type d&apos;offre
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Qualifie la mission pour le delivery (formation admin, conseil–IA, etc.) — voir la doc produit ; les phases
          resteront une bibliothèque, pas une séquence figée.
        </p>
        <select
          id="deal-offer-type"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
          disabled={isLoading || updateOffer.isPending}
          value={deal?.offerType ?? 'generic'}
          onChange={(e) => updateOffer.mutate(e.target.value as OfferType)}
        >
          {OFFER_TYPES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <InternalDocumentsList dealId={dealId} libraryTitle="Documents du deal" />

      <DealContractTunnel dealId={dealId} />
    </div>
  );
}
