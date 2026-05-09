import type { Metadata } from 'next';
import { ProjectsList } from '@/components/crm/projects/projects-list';

export const metadata: Metadata = { title: 'Projets' };

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
        <p className="text-muted-foreground">Suivez l'avancement de tous vos projets clients</p>
      </div>
      <ProjectsList />
    </div>
  );
}
