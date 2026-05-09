import type { Metadata } from 'next';
import { TaskDetailView } from '@/components/crm/tasks/task-detail-view';

export const metadata: Metadata = { title: 'Détail tâche' };

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return <TaskDetailView taskId={params.id} />;
}
