'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ClientProjectDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Projet</h1>
      <p className="text-muted-foreground text-sm">
        Détail du projet <span className="font-mono">{id}</span> — vue dédiée à compléter.
      </p>
      <Link href="/client/dashboard" className="text-primary text-sm font-medium hover:underline">
        ← Retour au tableau de bord
      </Link>
    </div>
  );
}
