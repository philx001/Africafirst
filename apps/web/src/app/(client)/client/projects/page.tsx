'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PROJECT_STATUSES } from '@crm/shared';
import { api } from '@/lib/api';
import { CheckSquare, FileText, FolderKanban } from 'lucide-react';

interface ClientTask {
  id: string;
  title: string;
  status: string;
  dueAt?: string;
}

interface ClientProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  tasks: ClientTask[];
  _count: { documents: number };
}

export default function ClientProjectsPage() {
  const { data: projects = [], isLoading } = useQuery<ClientProject[]>({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get('/client/projects') as Promise<ClientProject[]>,
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes projets</h1>
        <p className="text-muted-foreground">Suivi détaillé de vos projets, tâches et documents.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucun projet disponible pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const statusConfig = PROJECT_STATUSES.find((s) => s.id === project.status);
            const openTasks = project.tasks.filter((t) => t.status !== 'done').length;
            return (
              <Link
                key={project.id}
                href={`/client/projects/${project.id}`}
                className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{project.name}</p>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {openTasks} tâche{openTasks > 1 ? 's' : ''} en cours
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {project._count.documents} document{project._count.documents > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: statusConfig ? `${statusConfig.color}20` : '#94a3b820',
                        color: statusConfig?.color ?? '#64748b',
                      }}
                    >
                      {statusConfig?.label ?? project.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">{project.progress}%</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
