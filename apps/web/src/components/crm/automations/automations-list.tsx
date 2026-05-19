'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AUTOMATION_ACTIONS, AUTOMATION_TRIGGERS } from '@crm/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Activity, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutomationRuleRow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  conditions?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  isEnabled: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
  _count: { workflowLogs: number };
}

type ConditionOperator =
  | 'eq' | 'neq' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists' | 'not_exists';

interface RuleCondition {
  path: string;
  operator: ConditionOperator;
  value?: string;
}

// A simplified editable representation of an action.
// Raw unknown fields are kept in `extra` for display only.
interface EditableAction {
  type: string;
  // action-specific params
  title?: string;
  url?: string;
  name?: string;
  stage?: string;
  body?: string;
  priority?: string;
  dueInHours?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONDITION_OPERATOR_OPTIONS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: 'eq',          label: 'égal à',          needsValue: true  },
  { value: 'neq',         label: 'différent de',     needsValue: true  },
  { value: 'contains',    label: 'contient',         needsValue: true  },
  { value: 'not_contains',label: 'ne contient pas',  needsValue: true  },
  { value: 'starts_with', label: 'commence par',     needsValue: true  },
  { value: 'ends_with',   label: 'finit par',        needsValue: true  },
  { value: 'gt',          label: '>',                needsValue: true  },
  { value: 'gte',         label: '>=',               needsValue: true  },
  { value: 'lt',          label: '<',                needsValue: true  },
  { value: 'lte',         label: '<=',               needsValue: true  },
  { value: 'in',          label: 'dans (csv)',        needsValue: true  },
  { value: 'not_in',      label: 'pas dans (csv)',    needsValue: true  },
  { value: 'exists',      label: 'existe',            needsValue: false },
  { value: 'not_exists',  label: "n'existe pas",      needsValue: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isForbiddenError(err: unknown): boolean {
  return !!(err && typeof err === 'object' && 'statusCode' in err &&
    (err as { statusCode: number }).statusCode === 403);
}

function toEditableCondition(raw: Record<string, unknown>): RuleCondition | null {
  const path = String(raw.path ?? '').trim();
  const operator = String(raw.operator ?? raw.op ?? 'eq') as ConditionOperator;
  if (!path) return null;
  if (!('value' in raw)) return { path, operator };
  const valueRaw = raw.value;
  if (Array.isArray(valueRaw)) return { path, operator, value: valueRaw.map(String).join(', ') };
  return { path, operator, value: valueRaw == null ? '' : String(valueRaw) };
}

function serializeConditions(conditions: RuleCondition[]) {
  return conditions.map((c) => {
    const opMeta = CONDITION_OPERATOR_OPTIONS.find((o) => o.value === c.operator);
    const base = { path: c.path.trim(), operator: c.operator };
    if (!opMeta?.needsValue) return base;
    if (c.operator === 'in' || c.operator === 'not_in') {
      return { ...base, value: (c.value ?? '').split(',').map((x) => x.trim()).filter(Boolean) };
    }
    const numeric = Number(c.value ?? '');
    const isNumericOp = ['gt', 'gte', 'lt', 'lte'].includes(c.operator);
    return { ...base, value: (isNumericOp && Number.isFinite(numeric)) ? numeric : (c.value ?? '') };
  });
}

function toEditableAction(raw: Record<string, unknown>): EditableAction {
  return {
    type: String(raw.type ?? 'send_webhook'),
    title: raw.title != null ? String(raw.title) : undefined,
    url: raw.url != null ? String(raw.url) : undefined,
    name: raw.name != null ? String(raw.name) : undefined,
    stage: raw.stage != null ? String(raw.stage) : undefined,
    body: raw.body != null ? String(raw.body) : undefined,
    priority: raw.priority != null ? String(raw.priority) : undefined,
    dueInHours: raw.dueInHours != null ? String(raw.dueInHours) : undefined,
  };
}

function serializeAction(a: EditableAction): Record<string, unknown> {
  const out: Record<string, unknown> = { type: a.type };
  if (a.title?.trim()) out.title = a.title.trim();
  if (a.url?.trim()) out.url = a.url.trim();
  if (a.name?.trim()) out.name = a.name.trim();
  if (a.stage?.trim()) out.stage = a.stage.trim();
  if (a.body?.trim()) out.body = a.body.trim();
  if (a.priority?.trim()) out.priority = a.priority.trim();
  if (a.dueInHours?.trim()) {
    const n = Number(a.dueInHours.trim());
    if (Number.isFinite(n) && n > 0) out.dueInHours = n;
  }
  return out;
}

function actionSummary(a: Record<string, unknown>): string {
  const type = String(a.type ?? '');
  switch (type) {
    case 'create_task':         return `Tâche : ${String(a.title ?? '—')}`;
    case 'create_notification': return `Notif : ${String(a.title ?? '—')}`;
    case 'send_webhook':        return `Webhook → ${String(a.url ?? '—').slice(0, 50)}`;
    case 'update_deal_stage':   return `Deal stage → ${String(a.stage ?? '—')}`;
    case 'create_project':      return `Projet : ${String(a.name ?? '—')}`;
    default:                    return type;
  }
}

// ─── Sous-formulaire "Nouvelle action" ───────────────────────────────────────

function ActionForm({
  label,
  onAdd,
  disabled,
}: {
  label: string;
  onAdd: (action: EditableAction) => void;
  disabled?: boolean;
}) {
  const [type, setType] = useState<string>(AUTOMATION_ACTIONS[0]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [projName, setProjName] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueInHours, setDueInHours] = useState('');

  const handleAdd = () => {
    if (type === 'send_webhook' && !url.trim()) {
      toast.error('URL webhook obligatoire.');
      return;
    }
    onAdd({ type, title: title.trim() || undefined, url: url.trim() || undefined,
      name: projName.trim() || undefined, body: body.trim() || undefined,
      priority: priority || undefined, dueInHours: dueInHours.trim() || undefined });
    setTitle('');
    setUrl('');
    setProjName('');
    setBody('');
    setDueInHours('');
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border bg-background"
          disabled={disabled}
        >
          {AUTOMATION_ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {(type === 'create_task' || type === 'create_notification') && (
          <input
            className="px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Titre *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
          />
        )}
        {type === 'send_webhook' && (
          <input
            className="px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="URL webhook (https://…) *"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
          />
        )}
        {type === 'create_project' && (
          <input
            className="px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Nom du projet"
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
            disabled={disabled}
          />
        )}
        {type === 'create_notification' && (
          <input
            className="sm:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Corps de la notification (optionnel)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={disabled}
          />
        )}
        {type === 'create_task' && (
          <>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border bg-background"
              disabled={disabled}
            >
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              className="px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Échéance en heures (optionnel)"
              inputMode="numeric"
              value={dueInHours}
              onChange={(e) => setDueInHours(e.target.value)}
              disabled={disabled}
            />
          </>
        )}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-50"
      >
        + Ajouter action
      </button>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function AutomationsList() {
  const queryClient = useQueryClient();

  // ── État : création ────────────────────────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState<string>(AUTOMATION_TRIGGERS[0]);
  const [newConditions, setNewConditions] = useState<RuleCondition[]>([]);
  const [newCondPath, setNewCondPath] = useState('');
  const [newCondOp, setNewCondOp] = useState<ConditionOperator>('eq');
  const [newCondVal, setNewCondVal] = useState('');
  const [newActions, setNewActions] = useState<EditableAction[]>([]);

  // ── État : édition conditions ──────────────────────────────────────────────
  const [editCondRuleId, setEditCondRuleId] = useState<string | null>(null);
  const [editConds, setEditConds] = useState<RuleCondition[]>([]);
  const [editCondPath, setEditCondPath] = useState('');
  const [editCondOp, setEditCondOp] = useState<ConditionOperator>('eq');
  const [editCondVal, setEditCondVal] = useState('');

  // ── État : édition actions ─────────────────────────────────────────────────
  const [editActRuleId, setEditActRuleId] = useState<string | null>(null);
  const [editActions, setEditActions] = useState<EditableAction[]>([]);

  // ── Données ───────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then((r) => r as unknown as AutomationRuleRow[]),
    retry: false,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createRule = useMutation({
    mutationFn: () => {
      if (newActions.length === 0) throw new Error('Au moins une action est requise.');
      return api.post('/automations', {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        trigger: newTrigger,
        conditions: serializeConditions(newConditions),
        actions: newActions.map(serializeAction),
        isEnabled: true,
      });
    },
    onSuccess: () => {
      setNewName(''); setNewDescription(''); setNewConditions([]); setNewActions([]);
      setNewCondPath(''); setNewCondVal('');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Règle créée');
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : '';
      toast.error(m || 'Impossible de créer la règle');
    },
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      api.put(`/automations/${id}`, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
    onError: () => toast.error("Impossible de changer l'état de la règle"),
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Règle supprimée');
    },
    onError: () => toast.error('Suppression impossible'),
  });

  const saveConditions = useMutation({
    mutationFn: ({ id, conds }: { id: string; conds: RuleCondition[] }) =>
      api.put(`/automations/${id}`, { conditions: serializeConditions(conds) }),
    onSuccess: () => {
      setEditCondRuleId(null); setEditConds([]);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Conditions mises à jour');
    },
    onError: () => toast.error('Impossible de mettre à jour les conditions'),
  });

  const saveActions = useMutation({
    mutationFn: ({ id, actions }: { id: string; actions: EditableAction[] }) =>
      api.put(`/automations/${id}`, { actions: actions.map(serializeAction) }),
    onSuccess: () => {
      setEditActRuleId(null); setEditActions([]);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Actions mises à jour');
    },
    onError: () => toast.error('Impossible de mettre à jour les actions'),
  });

  const installProviderTemplates = useMutation({
    mutationFn: () => api.post('/automations/templates/provider-defaults'),
    onSuccess: (r: unknown) => {
      const t = r as { created?: string[]; existing?: string[]; integrationWebhookConfigured?: boolean };
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(
        `Templates provider : ${t.created?.length ?? 0} créé(s), ${t.existing?.length ?? 0} existant(s)` +
        (t.integrationWebhookConfigured ? '' : ' — webhook SI non configuré'),
      );
    },
    onError: () => toast.error('Installation des templates provider impossible'),
  });

  const installDealWonTemplates = useMutation({
    mutationFn: () => api.post('/automations/templates/deal-won-defaults'),
    onSuccess: (r: unknown) => {
      const t = r as { created?: string[]; existing?: string[] };
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(`Templates deal.won : ${t.created?.length ?? 0} créé(s), ${t.existing?.length ?? 0} existant(s)`);
    },
    onError: () => toast.error('Installation des templates deal.won impossible'),
  });

  // ── Helpers d'interaction ─────────────────────────────────────────────────
  const openEditConds = (rule: AutomationRuleRow) => {
    setEditActRuleId(null); setEditActions([]);
    if (editCondRuleId === rule.id) { setEditCondRuleId(null); setEditConds([]); return; }
    setEditCondRuleId(rule.id);
    setEditConds((rule.conditions ?? []).map(toEditableCondition).filter(Boolean) as RuleCondition[]);
    setEditCondPath(''); setEditCondOp('eq'); setEditCondVal('');
  };

  const openEditActions = (rule: AutomationRuleRow) => {
    setEditCondRuleId(null); setEditConds([]);
    if (editActRuleId === rule.id) { setEditActRuleId(null); setEditActions([]); return; }
    setEditActRuleId(rule.id);
    setEditActions((rule.actions ?? []).map(toEditableAction));
  };

  const addEditCond = () => {
    const path = editCondPath.trim();
    const meta = CONDITION_OPERATOR_OPTIONS.find((o) => o.value === editCondOp);
    if (!path) { toast.error('Champ payload obligatoire.'); return; }
    if (meta?.needsValue && !editCondVal.trim()) { toast.error('Valeur obligatoire pour cet opérateur.'); return; }
    setEditConds((prev) => [...prev, { path, operator: editCondOp, ...(meta?.needsValue ? { value: editCondVal.trim() } : {}) }]);
    setEditCondPath(''); setEditCondVal('');
  };

  // ── Rendu : états de chargement / erreur ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-2/3" /></div>
        ))}
      </div>
    );
  }
  if (isError && isForbiddenError(error)) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-foreground">Accès réservé aux administrateurs</p>
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

  return (
    <div className="space-y-4">
      {/* ── Formulaire création ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Nouvelle règle</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => installDealWonTemplates.mutate()}
              disabled={installDealWonTemplates.isPending}
              className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50">
              Installer templates deal.won
            </button>
            <button type="button" onClick={() => installProviderTemplates.mutate()}
              disabled={installProviderTemplates.isPending}
              className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50">
              Installer templates provider
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input className="px-3 py-2 text-sm rounded-lg border bg-background sm:col-span-2 lg:col-span-1"
            placeholder="Nom de la règle *"
            value={newName} onChange={(e) => setNewName(e.target.value)} />
          <select className="px-3 py-2 text-sm rounded-lg border bg-background"
            value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}>
            {AUTOMATION_TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Description (optionnelle)"
            value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
        </div>

        {/* Conditions à la création */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium">Conditions (optionnel — logique AND)</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="md:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Champ payload (ex: stage, offerType)"
              value={newCondPath} onChange={(e) => setNewCondPath(e.target.value)} />
            <select className="px-3 py-2 text-sm rounded-lg border bg-background"
              value={newCondOp} onChange={(e) => setNewCondOp(e.target.value as ConditionOperator)}>
              {CONDITION_OPERATOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input className="px-3 py-2 text-sm rounded-lg border bg-background"
              placeholder="Valeur"
              value={newCondVal} onChange={(e) => setNewCondVal(e.target.value)}
              disabled={!CONDITION_OPERATOR_OPTIONS.find((o) => o.value === newCondOp)?.needsValue} />
          </div>
          <button type="button"
            onClick={() => {
              const path = newCondPath.trim();
              const meta = CONDITION_OPERATOR_OPTIONS.find((o) => o.value === newCondOp);
              if (!path) { toast.error('Champ payload obligatoire.'); return; }
              if (meta?.needsValue && !newCondVal.trim()) { toast.error('Valeur obligatoire.'); return; }
              setNewConditions((prev) => [...prev, { path, operator: newCondOp, ...(meta?.needsValue ? { value: newCondVal.trim() } : {}) }]);
              setNewCondPath(''); setNewCondVal('');
            }}
            className="px-2 py-1 text-xs rounded border hover:bg-muted">
            + Ajouter condition
          </button>
          {newConditions.length > 0 && (
            <div className="space-y-1">
              {newConditions.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                  <span className="font-mono">{c.path} {c.operator}{c.value != null ? ` ${c.value}` : ''}</span>
                  <button type="button" className="text-destructive hover:underline"
                    onClick={() => setNewConditions((prev) => prev.filter((_, i) => i !== idx))}>
                    retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions à la création */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium">Actions <span className="text-destructive">*</span> (au moins une)</p>
          {newActions.length > 0 && (
            <div className="space-y-1">
              {newActions.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                  <span className="font-mono">{actionSummary(serializeAction(a))}</span>
                  <button type="button" className="text-destructive hover:underline"
                    onClick={() => setNewActions((prev) => prev.filter((_, i) => i !== idx))}>
                    retirer
                  </button>
                </div>
              ))}
            </div>
          )}
          <ActionForm label="Ajouter une action" onAdd={(a) => setNewActions((prev) => [...prev, a])} />
        </div>

        <div className="flex justify-end">
          <button type="button"
            disabled={!newName.trim() || newActions.length === 0 || createRule.isPending}
            onClick={() => createRule.mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
            {createRule.isPending ? 'Création…' : 'Créer la règle'}
          </button>
        </div>
      </div>

      {/* ── Liste des règles ────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {rules.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune règle d&apos;automatisation pour l&apos;instant.</p>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Règle</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Déclencheur</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">État</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Exéc.</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Dernière</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule) => (
              <tr key={rule.id}
                className={`transition-colors ${editCondRuleId === rule.id || editActRuleId === rule.id
                  ? 'bg-muted/30'
                  : 'hover:bg-muted/20'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(rule.conditions?.length ?? 0) > 0
                          ? `${rule.conditions?.length} cond.`
                          : 'Sans condition'}{' '}
                        · {(rule.actions?.length ?? 0)} action(s)
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                  {rule.trigger}
                </td>
                <td className="px-4 py-3">
                  <span className={rule.isEnabled
                    ? 'text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400'
                    : 'text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground'}>
                    {rule.isEnabled ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                  {rule.runCount}
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                  {rule.lastRunAt ? formatDate(rule.lastRunAt) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button"
                      className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-50"
                      onClick={() => toggleRule.mutate({ id: rule.id, isEnabled: !rule.isEnabled })}
                      disabled={toggleRule.isPending}>
                      {rule.isEnabled ? 'Désactiver' : 'Activer'}
                    </button>
                    <button type="button"
                      className={`px-2 py-1 text-xs rounded border disabled:opacity-50 ${editCondRuleId === rule.id ? 'bg-muted' : 'hover:bg-muted'}`}
                      onClick={() => openEditConds(rule)}>
                      Conditions
                    </button>
                    <button type="button"
                      className={`px-2 py-1 text-xs rounded border disabled:opacity-50 ${editActRuleId === rule.id ? 'bg-muted' : 'hover:bg-muted'}`}
                      onClick={() => openEditActions(rule)}>
                      Actions
                    </button>
                    <button type="button"
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-50"
                      disabled={deleteRule.isPending}
                      title="Supprimer la règle"
                      onClick={() => {
                        if (!confirm(`Supprimer la règle « ${rule.name} » ?`)) return;
                        deleteRule.mutate(rule.id);
                      }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Panneau : édition conditions ─────────────────────────────── */}
        {editCondRuleId && (() => {
          const rule = rules.find((r) => r.id === editCondRuleId);
          return (
            <div className="border-t p-4 bg-muted/20 space-y-3">
              <p className="text-sm font-medium">
                Conditions — <span className="text-muted-foreground font-normal">{rule?.name}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input className="md:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
                  placeholder="Champ payload (ex: offerType, deal.value)"
                  value={editCondPath} onChange={(e) => setEditCondPath(e.target.value)} />
                <select className="px-3 py-2 text-sm rounded-lg border bg-background"
                  value={editCondOp} onChange={(e) => setEditCondOp(e.target.value as ConditionOperator)}>
                  {CONDITION_OPERATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input className="px-3 py-2 text-sm rounded-lg border bg-background"
                  placeholder="Valeur (csv pour in/not_in)"
                  value={editCondVal} onChange={(e) => setEditCondVal(e.target.value)}
                  disabled={!CONDITION_OPERATOR_OPTIONS.find((o) => o.value === editCondOp)?.needsValue} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={addEditCond}
                  className="px-2 py-1 text-xs rounded border hover:bg-muted">
                  + Ajouter condition
                </button>
                <button type="button"
                  onClick={() => saveConditions.mutate({ id: editCondRuleId, conds: editConds })}
                  disabled={saveConditions.isPending}
                  className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50">
                  {saveConditions.isPending ? 'Enregistrement…' : 'Enregistrer conditions'}
                </button>
              </div>
              {editConds.length > 0 ? (
                <div className="space-y-1">
                  {editConds.map((c, idx) => (
                    <div key={idx}
                      className="flex items-center justify-between text-xs bg-background rounded px-2 py-1 border">
                      <span className="font-mono">{c.path} {c.operator}{c.value != null ? ` ${c.value}` : ''}</span>
                      <button type="button" className="text-destructive hover:underline"
                        onClick={() => setEditConds((prev) => prev.filter((_, i) => i !== idx))}>
                        retirer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aucune condition — la règle se déclenche pour tous les événements du trigger.
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Panneau : édition actions ─────────────────────────────────── */}
        {editActRuleId && (() => {
          const rule = rules.find((r) => r.id === editActRuleId);
          return (
            <div className="border-t p-4 bg-muted/20 space-y-3">
              <p className="text-sm font-medium">
                Actions — <span className="text-muted-foreground font-normal">{rule?.name}</span>
              </p>
              {editActions.length > 0 ? (
                <div className="space-y-1">
                  {editActions.map((a, idx) => (
                    <div key={idx}
                      className="flex items-center justify-between text-xs bg-background rounded px-2 py-1 border">
                      <span className="font-mono">{actionSummary(serializeAction(a))}</span>
                      <button type="button" className="text-destructive hover:underline"
                        onClick={() => setEditActions((prev) => prev.filter((_, i) => i !== idx))}>
                        retirer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-destructive/70">
                  Aucune action — la règle ne fera rien. Ajoutez au moins une action.
                </p>
              )}
              <ActionForm
                label="Ajouter une action"
                onAdd={(a) => setEditActions((prev) => [...prev, a])}
                disabled={saveActions.isPending}
              />
              <div className="flex justify-end">
                <button type="button"
                  onClick={() => saveActions.mutate({ id: editActRuleId, actions: editActions })}
                  disabled={saveActions.isPending || editActions.length === 0}
                  className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50">
                  {saveActions.isPending ? 'Enregistrement…' : 'Enregistrer actions'}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
