'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

interface QuoteRow {
  id: string;
  title: string;
  reference?: string;
  status: string;
  currency: string;
  totalAmount?: number;
  sentAt?: string;
  acceptedAt?: string;
  _count?: { contracts: number };
}

interface ContractRow {
  id: string;
  title: string;
  status: string;
  value?: number;
  currency: string;
  sentForSignatureAt?: string;
  signedAt?: string;
}

type Paginated<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const quoteLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
};

const contractLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent_for_signature: 'En attente de signature',
  signed: 'Signé',
  cancelled: 'Annulé',
};

export function DealContractTunnel({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [quoteTitle, setQuoteTitle] = useState('Proposition commerciale');
  const [quoteRef, setQuoteRef] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');

  const { data: quotesRes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotes', { dealId }],
    queryFn: () =>
      api.get(`/quotes?dealId=${dealId}&limit=50`).then((r) => r as unknown as Paginated<QuoteRow>),
  });

  const { data: contractsRes, isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts', { dealId }],
    queryFn: () =>
      api.get(`/contracts?dealId=${dealId}&limit=50`).then((r) => r as unknown as Paginated<ContractRow>),
  });

  const createQuote = useMutation({
    mutationFn: () =>
      api.post('/quotes', {
        title: quoteTitle,
        reference: quoteRef || undefined,
        dealId,
        totalAmount: quoteAmount ? Number(quoteAmount) : undefined,
        lineItems: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Devis créé');
    },
    onError: () => toast.error('Impossible de créer le devis'),
  });

  const sendQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Devis envoyé au contact');
    },
    onError: () => toast.error('Envoi impossible'),
  });

  const acceptQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Devis accepté');
    },
    onError: () => toast.error('Action impossible'),
  });

  const rejectQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Devis marqué comme refusé');
    },
    onError: () => toast.error('Action impossible'),
  });

  const fromQuote = useMutation({
    mutationFn: (quoteId: string) => api.post(`/contracts/from-quote/${quoteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Brouillon de contrat créé');
    },
    onError: () => toast.error('Création du contrat impossible'),
  });

  const sendContract = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/send-for-signature`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat envoyé pour signature (portail client)');
    },
    onError: () => toast.error('Envoi pour signature impossible'),
  });

  const quotes = quotesRes?.data ?? [];
  const contracts = contractsRes?.data ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Devis</h2>
        <div className="space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
          <label className="block font-medium">Nouveau devis</label>
          <input
            className="w-full px-3 py-2 rounded-md border bg-background"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder="Titre"
          />
          <div className="flex gap-2 flex-wrap">
            <input
              className="flex-1 min-w-[8rem] px-3 py-2 rounded-md border bg-background"
              value={quoteRef}
              onChange={(e) => setQuoteRef(e.target.value)}
              placeholder="Référence (optionnel)"
            />
            <input
              className="w-32 px-3 py-2 rounded-md border bg-background"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder="Montant"
              type="number"
            />
          </div>
          <button
            type="button"
            disabled={createQuote.isPending || !quoteTitle.trim()}
            onClick={() => createQuote.mutate()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Enregistrer le devis
          </button>
        </div>

        <div className="divide-y rounded-lg border">
          {loadingQuotes ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : quotes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun devis pour ce deal</p>
          ) : (
            quotes.map((q) => (
              <div key={q.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    {q.reference && <p className="text-xs text-muted-foreground font-mono">{q.reference}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{quoteLabels[q.status] ?? q.status}</span>
                </div>
                {q.totalAmount != null && (
                  <p className="text-sm">{formatCurrency(Number(q.totalAmount), q.currency)}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {q.status === 'draft' && (
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border hover:bg-muted"
                      onClick={() => sendQuote.mutate(q.id)}
                      disabled={sendQuote.isPending}
                    >
                      Envoyer au client
                    </button>
                  )}
                  {q.status === 'sent' && (
                    <>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-green-600/30 text-green-700 dark:text-green-400"
                        onClick={() => acceptQuote.mutate(q.id)}
                        disabled={acceptQuote.isPending}
                      >
                        Accepté (interne)
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() => rejectQuote.mutate(q.id)}
                        disabled={rejectQuote.isPending}
                      >
                        Refusé
                      </button>
                    </>
                  )}
                  {q.status === 'accepted' && (
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium"
                      onClick={() => fromQuote.mutate(q.id)}
                      disabled={fromQuote.isPending}
                    >
                      Générer le contrat
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Contrats</h2>
        <p className="text-sm text-muted-foreground">
          Après génération, envoyez pour signature : le signataire retrouve le contrat dans{' '}
          <strong>Portail client → Contrats & signatures</strong>.
        </p>
        <div className="divide-y rounded-lg border">
          {loadingContracts ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : contracts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun contrat pour ce deal</p>
          ) : (
            contracts.map((c) => (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{c.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    {contractLabels[c.status] ?? c.status}
                  </span>
                </div>
                {c.value != null && (
                  <p className="text-sm">{formatCurrency(Number(c.value), c.currency)}</p>
                )}
                {c.sentForSignatureAt && (
                  <p className="text-xs text-muted-foreground">
                    Envoyé le {formatDate(c.sentForSignatureAt)}
                  </p>
                )}
                {c.signedAt && (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Signé le {formatDate(c.signedAt)}
                  </p>
                )}
                {c.status === 'draft' && (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground font-medium"
                    onClick={() => sendContract.mutate(c.id)}
                    disabled={sendContract.isPending}
                  >
                    Envoyer pour signature
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
