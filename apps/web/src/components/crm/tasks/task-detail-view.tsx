'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import { TASK_STATUSES, type TaskStatus } from '@crm/shared';

interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt?: string;
  assignee?: { firstName?: string; lastName?: string };
}

interface TaskDetailData {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  dueAt?: string;
  createdAt: string;
  project?: { id: string; name: string };
  parentTask?: { id: string; title: string };
  assignee?: { firstName?: string; lastName?: string };
  subTasks: SubTask[];
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((r) => r as unknown as TaskDetailData),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm max-w-3xl">
        <p className="font-medium text-destructive">Tâche introuvable ou accès refusé.</p>
        <Link href="/tasks" className="text-primary hover:underline mt-2 inline-block">
          ← Retour aux tâches
        </Link>
      </div>
    );
  }

  const st = TASK_STATUSES.find((x) => x.id === data.status);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tâches
      </Link>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <CheckSquare className="w-8 h-8 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: st ? `${st.color}25` : '#94a3b825',
                  color: st?.color ?? '#64748b',
                }}
              >
                {st?.label ?? data.status}
              </span>
              <span className="text-xs text-muted-foreground capitalize">Priorité : {data.priority}</span>
            </div>
          </div>
        </div>

        {data.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.description}</p>}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t pt-4">
          {data.project && (
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Projet</dt>
              <dd className="font-medium">{data.project.name}</dd>
            </div>
          )}
          {data.assignee && (
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Assigné à</dt>
              <dd className="font-medium">
                {[data.assignee.firstName, data.assignee.lastName].filter(Boolean).join(' ') || '—'}
              </dd>
            </div>
          )}
          {data.dueAt && (
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Échéance</dt>
              <dd>{formatDate(data.dueAt)}</dd>
            </div>
          )}
          {data.parentTask && (
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Tâche parente</dt>
              <dd>
                <Link href={`/tasks/${data.parentTask.id}`} className="text-primary hover:underline">
                  {data.parentTask.title}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Créée le</dt>
            <dd>{formatDate(data.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {data.subTasks.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-medium text-sm">Sous-tâches</div>
          <ul className="divide-y">
            {data.subTasks.map((sub) => {
              const sst = TASK_STATUSES.find((x) => x.id === sub.status);
              return (
                <li key={sub.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Link href={`/tasks/${sub.id}`} className="font-medium text-sm hover:text-primary">
                    {sub.title}
                  </Link>
                  <span
                    className={cn('text-xs px-2 py-0.5 rounded-full self-start sm:self-auto font-medium')}
                    style={{
                      backgroundColor: sst ? `${sst.color}25` : '#94a3b825',
                      color: sst?.color ?? '#64748b',
                    }}
                  >
                    {sst?.label ?? sub.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
