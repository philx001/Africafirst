'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import {
  PROJECT_PHASE_STATUSES,
  PROJECT_STATUSES,
  type InteractionType,
  type ProjectPhaseStatus,
} from '@crm/shared';
import { toast } from 'sonner';
import { formatRelative } from '@/lib/utils';

interface ProjectPhaseRow {
  id: string;
  key: string;
  label: string;
  status: string;
  sortOrder: number;
  completedAt?: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  offerType?: string;
  contactId?: string | null;
  dealId?: string | null;
  deal?: { id: string; title: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  phases: ProjectPhaseRow[];
}

interface InteractionRow {
  id: string;
  type: InteractionType;
  subject?: string | null;
  notes?: string | null;
  occurredAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.get(`/projects/${projectId}`) as Promise<ProjectDetail>,
  });

  const bootstrapPhases = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/phases/bootstrap`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      toast.success('Phases prêtes');
    },
    onError: () => toast.error('Impossible d’initialiser les phases'),
  });

  const updatePhase = useMutation({
    mutationFn: ({ phaseId, status }: { phaseId: string; status: ProjectPhaseStatus }) =>
      api.patch(`/projects/${projectId}/phases/${phaseId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onError: () => toast.error('Mise à jour de phase impossible'),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions', 'project', projectId],
    queryFn: () =>
      api
        .get(`/interactions?projectId=${encodeURIComponent(projectId)}&limit=40`)
        .then((r: unknown) => (r as { data: InteractionRow[] }).data),
  });

  const addNote = useMutation({
    mutationFn: () =>
      api.post('/interactions', {
        type: 'note',
        notes: note.trim(),
        projectId,
        ...(project?.contactId ? { contactId: project.contactId } : {}),
        ...(project?.dealId ? { dealId: project.dealId } : {}),
      }),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['interactions', 'project', projectId] });
      toast.success('Note enregistrée');
    },
    onError: () => toast.error('Impossible d’enregistrer la note'),
  });

  const statusLabel =
    PROJECT_STATUSES.find((s) => s.id === project?.status)?.label ?? project?.status ?? '—';

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {isLoading ? (
            <div className="h-9 w-56 bg-muted rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? 'Projet'}</h1>
              <p className="text-muted-foreground text-sm">
                Statut : {statusLabel} · Progression {project?.progress ?? 0}%
              </p>
              {project?.deal && (
                <p className="text-sm mt-1">
                  Deal lié :{' '}
                  <Link href={`/deals/${project.deal.id}`} className="text-primary hover:underline">
                    {project.deal.title}
                  </Link>
                </p>
              )}
              {project?.contact && (
                <p className="text-sm text-muted-foreground mt-1">
                  Contact : {project.contact.firstName} {project.contact.lastName}
                </p>
              )}
            </>
          )}
        </div>
        <Link href="/projects" className="text-sm text-primary hover:underline shrink-0">
          ← Projets
        </Link>
      </div>

      {/* Phases */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Phases & onboarding</h2>
            <p className="text-xs text-muted-foreground">
              Jalons pilotage interne — marquez ignoré ou N/A selon le périmètre réel.
            </p>
          </div>
          {project && project.phases.length === 0 && (
            <button
              type="button"
              onClick={() => bootstrapPhases.mutate()}
              disabled={bootstrapPhases.isPending}
              className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              Initialiser les phases
            </button>
          )}
        </div>
        {!project || project.phases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {project?.phases.length === 0
              ? 'Aucune phase pour l’instant — utilisez le bouton ci-dessus pour créer le gabarit par défaut.'
              : 'Chargement…'}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {project.phases.map((phase) => {
              const cfg = PROJECT_PHASE_STATUSES.find((s) => s.id === phase.status);
              return (
                <li key={phase.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3">
                  <div>
                    <p className="font-medium text-sm">{phase.label}</p>
                    <p className="text-xs text-muted-foreground">Clé : {phase.key}</p>
                  </div>
                  <select
                    className="text-sm border rounded-md px-2 py-1.5 bg-background min-w-[11rem]"
                    value={phase.status}
                    onChange={(e) =>
                      updatePhase.mutate({ phaseId: phase.id, status: e.target.value as ProjectPhaseStatus })
                    }
                    disabled={updatePhase.isPending}
                    style={cfg ? { borderColor: cfg.color } : undefined}
                  >
                    {PROJECT_PHASE_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Interactions */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Activité / notes</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            className="flex-1 min-h-[88px] text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="Ajouter une note liée à ce projet…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="sm:self-end px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            disabled={!note.trim() || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            Enregistrer
          </button>
        </div>
        <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {interactions.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucune interaction pour ce projet.</li>
          ) : (
            interactions.map((it) => (
              <li key={it.id} className="text-sm border rounded-lg p-3 bg-muted/20">
                <div className="flex justify-between gap-2 text-xs text-muted-foreground mb-1">
                  <span className="uppercase tracking-wide">{it.type}</span>
                  <span>{formatRelative(it.occurredAt)}</span>
                </div>
                {it.notes && <p className="whitespace-pre-wrap">{it.notes}</p>}
                {it.user && (it.user.firstName || it.user.lastName) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Par {it.user.firstName ?? ''} {it.user.lastName ?? ''}
                  </p>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
