import type { Metadata } from 'next';
import { DealsKanban } from '@/components/kanban/deals-kanban';

export const metadata: Metadata = { title: 'Pipeline Commercial' };

export default function DealsPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Commercial</h1>
          <p className="text-muted-foreground">Glissez-déposez vos deals entre les colonnes</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <DealsKanban />
      </div>
    </div>
  );
}
