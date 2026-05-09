import type { Metadata } from 'next';
import { ProjectDetailClient } from '@/components/crm/projects/project-detail-client';

export const metadata: Metadata = { title: 'Projet' };

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient projectId={params.id} />;
}
