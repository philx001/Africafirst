'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';

const EXPORT_ITEMS = [
  { path: '/organizations/export/deals', filename: 'crm-deals', label: 'Deals' },
  { path: '/organizations/export/contacts', filename: 'crm-contacts', label: 'Contacts' },
  { path: '/organizations/export/projects', filename: 'crm-projects', label: 'Projets' },
  { path: '/organizations/export/tickets', filename: 'crm-tickets', label: 'Tickets' },
] as const;

async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DashboardExports() {
  const queryClient = useQueryClient();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: scheduled = [] } = useQuery({
    queryKey: ['organizations', 'exports', 'scheduled'],
    queryFn: () =>
      api.get('/organizations/export/scheduled?limit=6').then((r) =>
        (r as unknown) as Array<{
          id: string;
          dataset: 'deals' | 'contacts' | 'projects' | 'tickets';
          filename: string;
          createdAt: string;
          size: number;
          runAt: string | null;
          period: { from: string; to: string } | null;
        }>,
      ),
  });

  const runScheduledNow = useMutation({
    mutationFn: () =>
      api.put('/organizations/export/scheduled/run-now', {
        ...(from && to ? { from, to } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'exports', 'scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Exports planifiés générés');
    },
    onError: () => toast.error('Lancement impossible'),
  });

  const runExport = async (path: string, baseFilename: string) => {
    setLoadingPath(path);
    try {
      const blob = (await api.get(path, {
        responseType: 'blob',
      })) as Blob;

      const date = new Date().toISOString().slice(0, 10);
      await triggerDownload(blob, `${baseFilename}-${date}.csv`);
      toast.success('Export CSV généré');
    } catch {
      toast.error("Export impossible — vérifiez vos droits ou réessayez.");
    } finally {
      setLoadingPath(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold mb-1">Exports CSV</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Données de votre organisation (UTF-8, compatibles Excel).
      </p>
      <div className="flex flex-wrap gap-2">
        {EXPORT_ITEMS.map(({ path, filename, label }) => (
          <button
            key={path}
            type="button"
            disabled={loadingPath !== null}
            onClick={() => runExport(path, filename)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 shrink-0" />
            {loadingPath === path ? 'Export…' : label}
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Exports planifiés (derniers fichiers)</p>
          <button
            type="button"
            onClick={() => runScheduledNow.mutate()}
            disabled={runScheduledNow.isPending || loadingPath !== null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            {runScheduledNow.isPending ? 'Génération…' : 'Lancer maintenant'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Optionnel: renseigner une plage `from/to` (UTC) pour le lancement manuel. Sinon, la config
          `settings.scheduledExports` est utilisée (ex: rolling `periodDays`).
        </p>
        {scheduled.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun export planifié enregistré pour le moment.
          </p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {scheduled.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {item.filename} · {item.dataset.toUpperCase()}
                  {item.period ? ` · ${item.period.from} → ${item.period.to}` : ''}
                </span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
