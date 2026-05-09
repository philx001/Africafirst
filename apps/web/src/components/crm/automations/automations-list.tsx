'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';

interface AutomationRuleRow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  isEnabled: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
  _count: { workflowLogs: number };
}

function isForbiddenError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    return (err as { statusCode: number }).statusCode === 403;
  }
  return false;
}

export function AutomationsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then((r) => r as unknown as AutomationRuleRow[]),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError && isForbiddenError(error)) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-foreground">Accès réservé aux administrateurs</p>
        <p className="mt-2 max-w-md mx-auto">
          Les règles d&apos;automatisation peuvent être consultées et modifiées uniquement par un administrateur de
          l&apos;organisation.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Impossible de charger les automatisations.
      </div>
    );
  }

  const rules = data ?? [];

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucune règle d&apos;automatisation pour l&apos;instant.</p>
        <p className="text-xs mt-2">Créez des règles via l&apos;API ou un futur éditeur dans l&apos;interface.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Règle</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Déclencheur</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">État</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Exécutions</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Dernière exécution</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rule.description}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{rule.trigger}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    rule.isEnabled
                      ? 'text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400'
                      : 'text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground'
                  }
                >
                  {rule.isEnabled ? 'Actif' : 'Désactivé'}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{rule.runCount}</td>
              <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                {rule.lastRunAt ? formatDate(rule.lastRunAt) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
