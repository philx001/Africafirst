import type { Metadata } from 'next';
import { DealDetailClient } from '@/components/crm/deals/deal-detail-client';

export const metadata: Metadata = { title: 'Deal' };

export default function DealDetailPage({ params }: { params: { id: string } }) {
  return <DealDetailClient dealId={params.id} />;
}
