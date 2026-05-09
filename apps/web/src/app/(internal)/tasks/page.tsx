import type { Metadata } from 'next';
import { TasksList } from '@/components/crm/tasks/tasks-list';

export const metadata: Metadata = { title: 'Tâches' };

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tâches</h1>
        <p className="text-muted-foreground">Vue liste des tâches et sous-tâches de l&apos;organisation</p>
      </div>
      <TasksList />
    </div>
  );
}
