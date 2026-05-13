'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AUTOMATION_ACTIONS, AUTOMATION_TRIGGERS } from '@crm/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<string>(AUTOMATION_TRIGGERS[0]);
  const [actionType, setActionType] = useState<string>(AUTOMATION_ACTIONS[0]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('Automatisation déclenchée');
  const [taskTitle, setTaskTitle] = useState('Tâche automatique');
  const [projectName, setProjectName] = useState('Projet automatique');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then((r) => r as unknown as AutomationRuleRow[]),
    retry: false,
  });

  const createRule = useMutation({
    mutationFn: () => {
      let actions: Array<Record<string, unknown>> = [];
      if (actionType === 'create_task') {
        actions = [{ type: 'create_task', title: taskTitle || 'Tâche automatique' }];
      } else if (actionType === 'create_notification') {
        actions = [{ type: 'create_notification', title: notificationTitle || 'Automatisation déclenchée' }];
      } else if (actionType === 'send_webhook') {
        actions = [{ type: 'send_webhook', url: webhookUrl.trim() }];
      } else if (actionType === 'update_deal_stage') {
        actions = [{ type: 'update_deal_stage', stage: 'proposal' }];
      } else if (actionType === 'create_project') {
        actions = [{ type: 'create_project', name: projectName || 'Projet automatique' }];
      }

      return api.post('/automations', {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger,
        actions,
        conditions: [],
        isEnabled: true,
      });
    },
    onSuccess: () => {
      setName('');
      setDescription('');
      setWebhookUrl('');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Règle créée');
    },
    onError: () => toast.error('Impossible de créer la règle'),
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      api.put(`/automations/${id}`, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
    onError: () => toast.error("Impossible de changer l'état de la règle"),
  });

  const installProviderTemplates = useMutation({
    mutationFn: () => api.post('/automations/templates/provider-defaults'),
    onSuccess: (result: unknown) => {
      const typed = result as { created?: string[]; existing?: string[]; integrationWebhookConfigured?: boolean };
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      const createdCount = typed.created?.length ?? 0;
      const existingCount = typed.existing?.length ?? 0;
      toast.success(
        `Templates provider installes: ${createdCount} cree(s), ${existingCount} deja present(s)${
          typed.integrationWebhookConfigured ? '' : ' (webhook SI non configure)'
        }`,
      );
    },
    onError: () => toast.error('Installation des templates provider impossible'),
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
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Nouvelle règle</h2>
          <button
            type="button"
            onClick={() => installProviderTemplates.mutate()}
            disabled={installProviderTemplates.isPending}
            className="px-3 py-2 rounded-lg border text-xs disabled:opacity-50"
          >
            Installer templates provider
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Nom de la règle *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {AUTOMATION_TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            {AUTOMATION_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!name.trim() || (actionType === 'send_webhook' && !webhookUrl.trim()) || createRule.isPending}
            onClick={() => createRule.mutate()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {createRule.isPending ? 'Création…' : 'Créer la règle'}
          </button>
          <input
            className="lg:col-span-5 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Description (optionnelle)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {actionType === 'send_webhook' && (
            <input
              className="lg:col-span-5 px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="URL webhook (https://...)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          )}
          {actionType === 'create_task' && (
            <input
              className="lg:col-span-5 px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Titre de la tâche"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          )}
          {actionType === 'create_notification' && (
            <input
              className="lg:col-span-5 px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Titre notification"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
            />
          )}
          {actionType === 'create_project' && (
            <input
              className="lg:col-span-5 px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Nom du projet"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Règle</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Déclencheur</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">État</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Exécutions</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Dernière exécution</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
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
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-50"
                    onClick={() => toggleRule.mutate({ id: rule.id, isEnabled: !rule.isEnabled })}
                    disabled={toggleRule.isPending}
                  >
                    {rule.isEnabled ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
