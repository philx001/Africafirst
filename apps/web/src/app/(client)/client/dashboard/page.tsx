'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { FolderKanban, FileText, MessageSquare, CheckSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PROJECT_STATUSES } from '@crm/shared';

interface DashboardData {
  projects: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    tasks: Array<{ id: string; title: string; status: string; dueAt?: string }>;
  }>;
  recentDocuments: Array<{ id: string; filename: string; createdAt: string }>;
  unreadMessages: number;
}

export default function ClientDashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['client', 'dashboard'],
    queryFn: () => api.get('/client/dashboard') as Promise<DashboardData>,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { projects = [], recentDocuments = [], unreadMessages = 0 } = data || {};

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour 👋</h1>
        <p className="text-muted-foreground">Voici l'état de vos projets et activités récentes</p>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projets', value: projects.length, icon: FolderKanban, href: '/client/projects' },
          { label: 'Documents', value: recentDocuments.length, icon: FileText, href: '/client/documents' },
          { label: 'Messages non lus', value: unreadMessages, icon: MessageSquare, href: '/client/messages' },
          {
            label: 'Tâches en cours',
            value: projects.flatMap((p) => p.tasks).filter((t) => t.status !== 'done').length,
            icon: CheckSquare,
            href: '/client/projects',
          },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
            <Icon className="w-8 h-8 text-primary mb-2" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      {/* Projets en cours */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Mes projets</h2>
        <div className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun projet en cours</p>
          ) : (
            projects.map((project) => {
              const statusConfig = PROJECT_STATUSES.find((s) => s.id === project.status);
              return (
                <Link
                  key={project.id}
                  href={`/client/projects/${project.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{project.name}</p>
                      {statusConfig && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground flex-shrink-0">{project.progress}%</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Documents récents */}
      {recentDocuments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Documents récents</h2>
          <div className="rounded-xl border bg-card divide-y">
            {recentDocuments.map((doc) => (
              <Link
                key={doc.id}
                href="/client/documents"
                className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{doc.filename}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(doc.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
