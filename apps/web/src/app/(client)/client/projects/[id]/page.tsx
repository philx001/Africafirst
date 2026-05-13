'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_STATUSES } from '@crm/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { CheckSquare, FileText } from 'lucide-react';

interface ClientTask {
  id: string;
  title: string;
  status: string;
  dueAt?: string;
  priority?: string;
}

interface ClientProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  description?: string | null;
  dueDate?: string | null;
  tasks: ClientTask[];
  _count: { documents: number };
}

export default function ClientProjectDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: project, isLoading } = useQuery<ClientProject>({
    queryKey: ['client', 'projects', id],
    queryFn: () => api.get(`/client/projects/${id}`) as Promise<ClientProject>,
    enabled: Boolean(id),
  });
  const statusConfig = PROJECT_STATUSES.find((x) => x.id === project?.status);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/client/projects" className="text-primary text-sm font-medium hover:underline">
        ← Retour à mes projets
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          <div className="h-56 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : !project ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Projet introuvable ou inaccessible.
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <div className="mt-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: statusConfig ? `${statusConfig.color}20` : '#94a3b820',
                      color: statusConfig?.color ?? '#64748b',
                    }}
                  >
                    {statusConfig?.label ?? project.status}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {project.dueDate ? `Échéance : ${formatDate(project.dueDate)}` : 'Sans échéance'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-5 text-sm text-muted-foreground border-t pt-3">
              <span className="inline-flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                {project.tasks.length} tâches
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {project._count.documents} documents
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b font-medium text-sm">Tâches du projet</div>
            <ul className="divide-y">
              {project.tasks.length === 0 ? (
                <li className="px-4 py-8 text-sm text-muted-foreground text-center">Aucune tâche pour ce projet.</li>
              ) : (
                project.tasks.map((task) => (
                  <li key={task.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
                    <span className="font-medium">{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.status}
                      {task.dueAt ? ` · ${formatDate(task.dueAt)}` : ''}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
