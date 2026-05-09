'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Search, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { TASK_STATUSES, type TaskStatus } from '@crm/shared';

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  dueAt?: string;
  project?: { id: string; name: string };
  assignee?: { firstName?: string; lastName?: string };
  subTasks: { id: string; status: string }[];
}

type Paginated<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const priorityConfig = {
  urgent: { icon: AlertTriangle, color: 'text-red-500' },
  high: { icon: AlertTriangle, color: 'text-orange-500' },
  medium: { icon: Clock, color: 'text-yellow-500' },
  low: { icon: Clock, color: 'text-slate-400' },
};

const STATUS_FILTER: Array<{ id: TaskStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Toutes' },
  ...TASK_STATUSES.map((s) => ({ id: s.id as TaskStatus, label: s.label })),
];

function subTaskProgress(subTasks: { status: string }[]) {
  if (!subTasks.length) return null;
  const done = subTasks.filter((t) => t.status === 'done').length;
  return `${done}/${subTasks.length}`;
}

export function TasksList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { page, search, statusFilter }],
    queryFn: () => {
      const statusQ = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const searchQ = search ? `&search=${encodeURIComponent(search)}` : '';
      return api
        .get(`/tasks?page=${page}&limit=30${statusQ}${searchQ}`)
        .then((r) => r as unknown as Paginated<TaskRow>);
    },
    placeholderData: (prev) => prev,
  });

  const tasks = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher une tâche..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTER.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStatusFilter(s.id);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tâche</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Projet</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Assigné</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Échéance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune tâche à afficher
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const st = TASK_STATUSES.find((x) => x.id === task.status);
                const p = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                const PriorityIcon = p.icon;
                const subProg = subTaskProgress(task.subTasks);

                return (
                  <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/tasks/${task.id}`} className="flex items-center gap-2 group">
                        <CheckSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium group-hover:text-primary transition-colors truncate">{task.title}</p>
                          {subProg && (
                            <p className="text-xs text-muted-foreground">Sous-tâches : {subProg}</p>
                          )}
                        </div>
                        <PriorityIcon className={cn('w-3.5 h-3.5 flex-shrink-0 ml-auto sm:ml-0', p.color)} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {task.project ? (
                        <span className="truncate block max-w-[12rem]" title={task.project.name}>
                          {task.project.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {task.assignee
                        ? [task.assignee.firstName, task.assignee.lastName].filter(Boolean).join(' ') || '—'
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: st ? `${st.color}25` : '#94a3b825',
                          color: st?.color ?? '#64748b',
                        }}
                      >
                        {st?.label ?? task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                      {task.dueAt ? formatDate(task.dueAt) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>
              {meta.total} tâche{meta.total > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Précédent
              </button>
              <span className="px-3 py-1">
                {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1 rounded-lg border disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
