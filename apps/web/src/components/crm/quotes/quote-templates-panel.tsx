'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

type QuoteTemplate = {
  id: string;
  title: string;
  description?: string | null;
  prestationType: string;
  content: string;
  isDefault: boolean;
};

const PREST_LABELS: Record<string, string> = {
  plateforme_formation: 'Plateforme de formation',
  creation_application_site: 'Création application/site',
  conseil: 'Conseil',
  sensibilisation_formation_ia: 'Sensibilisation / formation IA',
  autre: 'Autre',
};

export function QuoteTemplatesPanel() {
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplPrestation, setTplPrestation] = useState('plateforme_formation');
  const [tplContent, setTplContent] = useState('');

  const { data: quoteTemplates = [] } = useQuery({
    queryKey: ['quotes', 'templates'],
    queryFn: () => api.get('/quotes/templates') as Promise<QuoteTemplate[]>,
  });

  const saveTpl = useMutation({
    mutationFn: () =>
      api.post('/quotes/templates', {
        title: tplTitle.trim(),
        description: tplDescription.trim() || undefined,
        prestationType: tplPrestation,
        content: tplContent,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', 'templates'] });
      toast.success('Modèle de devis enregistré');
      setTplTitle('');
      setTplDescription('');
      setTplContent('');
      setOpenForm(false);
    },
    onError: () => toast.error('Enregistrement impossible'),
  });

  const delTpl = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', 'templates'] });
      toast.success('Modèle supprimé');
    },
    onError: () => toast.error('Suppression impossible'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">Modèles de devis (tunnel commercial)</h3>
          <p className="text-xs text-muted-foreground">
            Génération depuis la fiche deal ; variables identiques aux contrats +{' '}
            <code className="text-[10px] bg-muted px-0.5 rounded">{'{{prestation.*}}'}</code>,{' '}
            <code className="text-[10px] bg-muted px-0.5 rounded">{'{{deal.offerType}}'}</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted"
        >
          {openForm ? 'Fermer' : 'Nouveau modèle'}
        </button>
      </div>

      {openForm && (
        <div className="space-y-2 border-t pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="px-3 py-2 rounded-lg border bg-background text-sm"
              placeholder="Titre du modèle"
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-lg border bg-background text-sm"
              value={tplPrestation}
              onChange={(e) => setTplPrestation(e.target.value)}
            >
              {Object.entries(PREST_LABELS).map(([key, lab]) => (
                <option key={key} value={key}>
                  {lab}
                </option>
              ))}
            </select>
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            placeholder="Description (optionnel)"
            value={tplDescription}
            onChange={(e) => setTplDescription(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-xs"
            rows={8}
            value={tplContent}
            onChange={(e) => setTplContent(e.target.value)}
            placeholder="Bonjour {{contact.fullName}},&#10;&#10;Proposition pour {{account.name}} — {{deal.offerTypeLabel}}..."
          />
          <button
            type="button"
            disabled={!tplTitle.trim() || !tplContent.trim() || saveTpl.isPending}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            onClick={() => saveTpl.mutate()}
          >
            Enregistrer
          </button>
        </div>
      )}

      <div className="divide-y rounded-lg border text-sm max-h-48 overflow-auto">
        {quoteTemplates.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Aucun modèle de devis — créez-en un pour pré-remplir les propositions.</p>
        ) : (
          quoteTemplates.map((t) => (
            <div key={t.id} className="p-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {PREST_LABELS[t.prestationType] ?? t.prestationType}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-destructive hover:underline shrink-0"
                onClick={() => {
                  if (confirm('Supprimer ce modèle de devis ?')) delTpl.mutate(t.id);
                }}
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
