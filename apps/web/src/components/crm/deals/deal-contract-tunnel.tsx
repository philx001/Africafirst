'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { PROJECT_STATUSES } from '@crm/shared';

interface QuoteRow {
  id: string;
  title: string;
  reference?: string;
  status: string;
  currency: string;
  totalAmount?: number;
  prestationType?: string;
  body?: string | null;
  sentAt?: string;
  acceptedAt?: string;
  template?: { id: string; title: string; prestationType: string } | null;
  _count?: { contracts: number };
}

interface QuoteTemplateBrief {
  id: string;
  title: string;
  prestationType: string;
  description?: string | null;
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

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  tags: string[];
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
  to_modify: 'À modifier',
  sent_for_signature: 'En attente de signature',
  signed: 'Signé',
  cancelled: 'Annulé',
};

const PRESTATION_LABELS: Record<string, string> = {
  plateforme_formation: 'Plateforme formation',
  creation_application_site: 'Création app/site',
  conseil: 'Conseil',
  sensibilisation_formation_ia: 'Sensib. / formation IA',
  autre: 'Autre',
};

export function DealContractTunnel({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [quoteTitle, setQuoteTitle] = useState('Proposition commerciale');
  const [quoteRef, setQuoteRef] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quotePrestation, setQuotePrestation] = useState('autre');

  const [tplFilter, setTplFilter] = useState<string>('all');
  const [selectedTplId, setSelectedTplId] = useState('');
  const [fromTplTitle, setFromTplTitle] = useState('');

  const { data: quotesRes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotes', { dealId }],
    queryFn: () =>
      api.get(`/quotes?dealId=${dealId}&limit=50`).then((r) => r as unknown as Paginated<QuoteRow>),
  });

  const templatesUrl =
    tplFilter === 'all' ? '/quotes/templates' : `/quotes/templates?prestationType=${encodeURIComponent(tplFilter)}`;

  const { data: quoteTemplates = [], isLoading: loadingTpls } = useQuery({
    queryKey: ['quotes', 'templates', { filter: tplFilter }],
    queryFn: () => api.get(templatesUrl) as Promise<QuoteTemplateBrief[]>,
  });

  const { data: contractsRes, isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts', { dealId }],
    queryFn: () =>
      api.get(`/contracts?dealId=${dealId}&limit=50`).then((r) => r as unknown as Paginated<ContractRow>),
  });

  const { data: projectsRes, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', { dealId }],
    queryFn: () =>
      api.get(`/projects?dealId=${dealId}&limit=20`).then((r) => r as unknown as Paginated<ProjectRow>),
  });

  const createQuote = useMutation({
    mutationFn: () =>
      api.post('/quotes', {
        title: quoteTitle,
        reference: quoteRef || undefined,
        dealId,
        totalAmount: quoteAmount ? Number(quoteAmount) : undefined,
        lineItems: [],
        prestationType: quotePrestation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', { dealId }] });
      toast.success('Devis créé');
    },
    onError: () => toast.error('Impossible de créer le devis'),
  });

  const fromTemplateQuote = useMutation({
    mutationFn: () =>
      api.post('/quotes/from-template', {
        templateId: selectedTplId,
        dealId,
        title: fromTplTitle.trim() || undefined,
        reference: quoteRef.trim() || undefined,
        totalAmount: quoteAmount ? Number(quoteAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', { dealId }] });
      toast.success('Devis généré depuis le modèle');
      setFromTplTitle('');
    },
    onError: () => toast.error('Génération depuis modèle impossible'),
  });

  const sendQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', { dealId }] });
      toast.success('Devis envoyé au contact');
    },
    onError: () => toast.error('Envoi impossible'),
  });

  const acceptQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', { dealId }] });
      toast.success('Devis accepté');
    },
    onError: () => toast.error('Action impossible'),
  });

  const rejectQuote = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', { dealId }] });
      toast.success('Devis marqué comme refusé');
    },
    onError: () => toast.error('Action impossible'),
  });

  const fromQuote = useMutation({
    mutationFn: (quoteId: string) => api.post(`/contracts/from-quote/${quoteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', { dealId }] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['projects', { dealId }] });
      toast.success('Brouillon de contrat créé');
    },
    onError: () => toast.error('Création du contrat impossible'),
  });

  const sendContract = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/send-for-signature`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', { dealId }] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['projects', { dealId }] });
      toast.success('Contrat envoyé pour signature (portail client)');
    },
    onError: () => toast.error('Envoi pour signature impossible'),
  });

  const quotes = quotesRes?.data ?? [];
  const contracts = contractsRes?.data ?? [];
  const projects = projectsRes?.data ?? [];
  const tunnelProjects = projects.filter((p) => p.tags?.includes('tunnel_onboarding'));
  const otherProjects = projects.filter((p) => !p.tags?.includes('tunnel_onboarding'));
  const projectsOrdered = [...tunnelProjects, ...otherProjects];

  const projectStatusLabel = (s: string) => PROJECT_STATUSES.find((x) => x.id === s)?.label ?? s;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Devis</h2>
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/10 p-4 text-sm">
          <label className="block font-medium">Depuis modèle interne</label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Modèles gérés dans <strong className="text-foreground">Contrats</strong> (section « Modèles de devis »).
            Les champs client / entreprise / deal sont remplis automatiquement (placeholders comme pour les contrats +
            prestation et offre).
          </p>
          <select
            className="w-full px-3 py-2 rounded-md border bg-background text-xs"
            value={tplFilter}
            onChange={(e) => {
              setTplFilter(e.target.value);
              setSelectedTplId('');
            }}
          >
            <option value="all">Tous types de prestation</option>
            {Object.entries(PRESTATION_LABELS).map(([k, lab]) => (
              <option key={k} value={k}>
                {lab}
              </option>
            ))}
          </select>
          <select
            className="w-full px-3 py-2 rounded-md border bg-background text-xs"
            value={selectedTplId}
            onChange={(e) => setSelectedTplId(e.target.value)}
            disabled={loadingTpls}
          >
            <option value="">Choisir un modèle…</option>
            {quoteTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({PRESTATION_LABELS[t.prestationType] ?? t.prestationType})
              </option>
            ))}
          </select>
          <input
            className="w-full px-3 py-2 rounded-md border bg-background text-xs"
            placeholder="Titre du devis (optionnel, sinon titre du modèle)"
            value={fromTplTitle}
            onChange={(e) => setFromTplTitle(e.target.value)}
          />
          <button
            type="button"
            disabled={!selectedTplId || fromTemplateQuote.isPending}
            onClick={() => fromTemplateQuote.mutate()}
            className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            Générer le devis pré-rempli
          </button>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
          <label className="block font-medium">Nouveau devis (sans modèle)</label>
          <input
            className="w-full px-3 py-2 rounded-md border bg-background"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder="Titre"
          />
          <select
            className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            value={quotePrestation}
            onChange={(e) => setQuotePrestation(e.target.value)}
          >
            {Object.entries(PRESTATION_LABELS).map(([k, lab]) => (
              <option key={k} value={k}>
                Type prestation — {lab}
              </option>
            ))}
          </select>
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
            className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-50"
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
                  <div className="space-y-1">
                    <p className="font-medium">{q.title}</p>
                    {q.reference && <p className="text-xs text-muted-foreground font-mono">{q.reference}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">
                        {quoteLabels[q.status] ?? q.status}
                      </span>
                      {(q.prestationType || q.template) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {PRESTATION_LABELS[q.prestationType ?? ''] ??
                            PRESTATION_LABELS[q.template?.prestationType ?? ''] ??
                            q.prestationType ??
                            q.template?.prestationType}
                        </span>
                      )}
                      {q.template?.title && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
                          Modèle : {q.template.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {q.totalAmount != null && (
                  <p className="text-sm">{formatCurrency(Number(q.totalAmount), q.currency)}</p>
                )}
                {q.body && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-auto border rounded p-2 bg-muted/30">
                    {q.body.length > 800 ? `${q.body.slice(0, 800)}…` : q.body}
                  </p>
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

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Onboarding</h2>
        <p className="text-sm text-muted-foreground">
          Lorsqu&apos;un contrat lié à ce deal est <strong>signé</strong>, le deal passe en{' '}
          <strong>gagné</strong> et un projet <span className="font-medium">Onboarding — …</span> est créé
          avec les phases métier (la phase « Contrat & signature » est déjà marquée terminée).
        </p>
        <p className="text-xs text-muted-foreground">
          Désactivation globale possible via{' '}
          <code className="bg-muted px-1 rounded text-[11px]">disableAutoOnboardingProject</code> dans le JSON
          organisation.
        </p>
        <div className="divide-y rounded-lg border">
          {loadingProjects ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : projectsOrdered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Aucun projet pour ce deal — il sera créé automatiquement après la première signature de contrat.
            </p>
          ) : (
            projectsOrdered.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.name}
                    </Link>
                    {p.tags?.includes('tunnel_onboarding') && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        Tunnel
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    {projectStatusLabel(p.status)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ouvrir le projet pour suivre les phases (kickoff, onboarding client, livraison…).
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
