'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PROJECT_STATUSES } from '@crm/shared';
import { FolderKanban, CheckSquare, FileText } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate?: string;
  deal?: { title: string };
  contact?: { firstName: string; lastName: string };
  _count: { tasks: number; documents: number };
}

export function ProjectsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects?limit=50').then((r: unknown) => (r as { data: { data: Project[] } }).data.data),
  });

  const getStatusConfig = (status: string) =>
    PROJECT_STATUSES.find((s) => s.id === status) || PROJECT_STATUSES[0];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun projet pour l'instant</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.map((project) => {
        const statusConfig = getStatusConfig(project.status);
        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-snug">{project.name}</h3>
              <span
                className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                style={{
                  backgroundColor: `${statusConfig.color}20`,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Progression */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                {project._count.tasks} tâches
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {project._count.documents} docs
              </span>
              {project.dueDate && (
                <span className="ml-auto">Échéance : {formatDate(project.dueDate)}</span>
              )}
            </div>

            {project.contact && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                Client : {project.contact.firstName} {project.contact.lastName}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
