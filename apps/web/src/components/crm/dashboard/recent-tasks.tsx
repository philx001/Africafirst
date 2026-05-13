'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt?: string;
  project?: { name: string };
}

const priorityConfig = {
  urgent: { icon: AlertTriangle, color: 'text-red-500' },
  high: { icon: AlertTriangle, color: 'text-orange-500' },
  medium: { icon: Clock, color: 'text-yellow-500' },
  low: { icon: Clock, color: 'text-slate-400' },
};

export function RecentTasks() {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () =>
      api
        .get('/tasks?limit=5&status=todo')
        .then((r: unknown) => (r as { data: Task[] }).data),
  });

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="font-semibold">Tâches à faire</h2>
        <Link href="/tasks" className="text-sm text-primary hover:underline">Voir tout →</Link>
      </div>
      <div className="divide-y">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : data?.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground text-center">Toutes les tâches sont terminées !</p>
        ) : (
          data?.map((task) => {
            const p = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const PriorityIcon = p.icon;

            return (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                <CheckSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.project && (
                    <p className="text-xs text-muted-foreground truncate">{task.project.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityIcon className={cn('w-3.5 h-3.5', p.color)} />
                  {task.dueAt && (
                    <span className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
