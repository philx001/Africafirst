'use client';

import Link from 'next/link';
import { FolderKanban } from 'lucide-react';

export default function ClientProjectsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes projets</h1>
        <p className="text-muted-foreground">
          Consultez le tableau de bord pour voir la liste détaillée et la progression de vos projets.
        </p>
      </div>
      <Link
        href="/client/dashboard"
        className="flex items-center gap-4 rounded-xl border bg-card p-6 hover:bg-muted/40 transition-colors"
      >
        <FolderKanban className="w-10 h-10 text-primary shrink-0" />
        <div>
          <p className="font-medium">Retour au tableau de bord</p>
          <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de vos projets et documents</p>
        </div>
      </Link>
    </div>
  );
}
