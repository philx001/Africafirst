'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DEAL_STAGES, DealStage } from '@crm/shared';
import { toast } from 'sonner';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  value?: number;
  stage: DealStage;
  contact?: { firstName: string; lastName: string };
  account?: { name: string };
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <Link
        href={`/deals/${deal.id}`}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted z-10 text-muted-foreground hover:text-foreground"
        title="Devis et contrat"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
      <p className="text-sm font-medium leading-snug pr-7">{deal.title}</p>
      {deal.contact && (
        <p className="text-xs text-muted-foreground mt-1">
          {deal.contact.firstName} {deal.contact.lastName}
          {deal.account && ` · ${deal.account.name}`}
        </p>
      )}
      {deal.value && (
        <p className="text-sm font-bold text-primary mt-2">{formatCurrency(deal.value)}</p>
      )}
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
}: {
  stage: (typeof DEAL_STAGES)[number];
  deals: Deal[];
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[240px] max-w-[280px]">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {deals.length}
          </span>
        </div>
      </div>
      <div className="flex-1 rounded-xl bg-muted/30 border border-dashed p-2 min-h-[60px] space-y-2">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function DealsKanban() {
  const queryClient = useQueryClient();
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const { data: kanban = {}, isLoading } = useQuery({
    queryKey: ['deals', 'kanban'],
    queryFn: () => api.get('/deals/kanban').then((r: unknown) => (r as { data: Record<string, Deal[]> }).data),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      api.put(`/deals/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: () => toast.error('Erreur lors du déplacement du deal'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const allDeals = Object.values(kanban).flat();
    setActiveDeal(allDeals.find((d) => d.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const targetStage = (over.data.current?.stage || over.id) as DealStage;
    const sourceStage = (active.data.current as { stage?: DealStage })?.stage;

    if (targetStage && targetStage !== sourceStage) {
      updateStageMutation.mutate({ id: active.id as string, stage: targetStage });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {DEAL_STAGES.map((s) => (
          <div key={s.id} className="min-w-[240px] h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
        {DEAL_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={(kanban[stage.id] || []) as Deal[]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  );
}
