'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DealContractTunnel } from '@/components/crm/deals/deal-contract-tunnel';
import { InternalDocumentsList } from '@/components/crm/documents/internal-documents-list';
import { EntityActivityTimeline } from '@/components/crm/activity/entity-activity-timeline';
import { OFFER_TYPES, type OfferType } from '@crm/shared';
import { toast } from 'sonner';

interface DealDetail {
  id: string;
  title: string;
  stage: string;
  offerType?: OfferType;
  contactId?: string | null;
  contact?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
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

      <EntityActivityTimeline variant={{ mode: 'deal', dealId, contactId: deal?.contactId }} />

      <InternalDocumentsList dealId={dealId} libraryTitle="Documents du deal" />

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm space-y-2">
        <h2 className="font-semibold text-base">Tunnel Devis → Contrat → Onboarding</h2>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Créer un devis, l&apos;envoyer au contact, puis l&apos;accepter (ou le faire accepter côté portail lorsque prévu).</li>
          <li>Générer le contrat à partir du devis accepté, puis l&apos;envoyer pour signature (portail client).</li>
          <li>Après signature : deal en <strong>gagné</strong>, projet « Onboarding » avec phases métier créé automatiquement.</li>
        </ol>
        {!isLoading && !deal?.contactId && (
          <p className="text-amber-800 dark:text-amber-400 text-xs pt-1">
            Aucun contact lié au deal — associez un contact sur le kanban ou en mettant à jour le deal pour pouvoir{' '}
            <strong>envoyer le devis</strong> et <strong>signer le contrat</strong>.
          </p>
        )}
        {!isLoading && deal?.contactId && deal.contact && (
          <p className="text-xs text-muted-foreground">
            Contact&nbsp;:{' '}
            <strong>
              {[deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(' ') ||
                deal.contact.email ||
                '—'}
            </strong>
            {deal.contact.email ? <> ({deal.contact.email})</> : null}
          </p>
        )}
      </div>

      <DealContractTunnel dealId={dealId} />
    </div>
  );
}
