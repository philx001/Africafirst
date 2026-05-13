'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TASK_STATUSES } from '@crm/shared';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectOption {
  id: string;
  name: string;
}

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Basse' },
  { id: 'medium', label: 'Moyenne' },
  { id: 'high', label: 'Haute' },
  { id: 'urgent', label: 'Urgente' },
] as const;

export function TaskQuickCreate() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [dueAt, setDueAt] = useState('');

  const { data: projectsResp } = useQuery({
    queryKey: ['projects', 'picklist', 'task-create'],
    queryFn: () => api.get('/projects?limit=100') as Promise<{ data: ProjectOption[] }>,
  });
  const projects = projectsResp?.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      api.post('/tasks', {
        title: title.trim(),
        status,
        priority,
        ...(projectId ? { projectId } : {}),
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      }),
    onSuccess: () => {
      setOpen(false);
      setTitle('');
      setStatus('todo');
      setPriority('medium');
      setProjectId('');
      setDueAt('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tâche créée');
    },
    onError: () => toast.error('Création de la tâche impossible'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Nouvelle tâche</h2>
          <p className="text-xs text-muted-foreground">Ajout rapide sans quitter la vue liste.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {open ? 'Fermer' : 'Créer une tâche'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            placeholder="Titre de la tâche *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={status} onChange={(e) => setStatus(e.target.value)}>
            {TASK_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select className="px-3 py-2 text-sm rounded-lg border bg-background" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {create.isPending ? 'Création…' : 'Enregistrer'}
          </button>

          <select
            className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border bg-background"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Projet (optionnel)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="px-3 py-2 text-sm rounded-lg border bg-background"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
