'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Download, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRef, useState } from 'react';

interface DocRow {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  description?: string;
  dealId?: string;
  projectId?: string;
  contactId?: string;
  accountId?: string;
  createdAt: string;
}

export function InternalDocumentsList({
  dealId,
  contactId,
  projectId,
  libraryTitle = 'Bibliothèque',
}: {
  dealId?: string;
  contactId?: string;
  projectId?: string;
  libraryTitle?: string;
} = {}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [desc, setDesc] = useState('');
  const [picked, setPicked] = useState<File | null>(null);

  const scoped = Boolean(dealId || contactId || projectId);
  const qs = new URLSearchParams();
  if (dealId) qs.set('dealId', dealId);
  if (contactId) qs.set('contactId', contactId);
  if (projectId) qs.set('projectId', projectId);
  const listSuffix = qs.toString() ? `?${qs}` : '';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', 'internal', dealId ?? null, contactId ?? null, projectId ?? null],
    queryFn: () => api.get(`/documents${listSuffix}`).then((r) => r as unknown as DocRow[]),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      if (desc.trim()) form.append('description', desc.trim());
      if (dealId) form.append('dealId', dealId);
      if (contactId) form.append('contactId', contactId);
      if (projectId) form.append('projectId', projectId);
      return api.post('/documents/upload', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDesc('');
      setPicked(null);
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Document envoyé');
    },
    onError: () => toast.error('Échec de l\'upload'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document supprimé');
    },
    onError: () => toast.error('Suppression impossible'),
  });

  const download = async (id: string) => {
    try {
      const res = (await api.get(`/documents/${id}/signed-url`)) as { url: string };
      if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Téléchargement impossible');
    }
  };

  const ctx = (d: DocRow) => {
    const parts: string[] = [];
    if (d.dealId) parts.push(`Deal ${d.dealId.slice(0, 8)}…`);
    if (d.projectId) parts.push(`Projet ${d.projectId.slice(0, 8)}…`);
    if (d.contactId) parts.push(`Contact ${d.contactId.slice(0, 8)}…`);
    if (d.accountId) parts.push(`Entreprise ${d.accountId.slice(0, 8)}…`);
    return parts.length ? parts.join(' · ') : '—';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 space-y-3 max-w-xl">
        <h2 className="text-sm font-semibold">Envoyer un fichier</h2>
        <input
          ref={fileRef}
          type="file"
          className="text-sm w-full"
          onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
        />
        <input
          type="text"
          placeholder="Description (optionnelle)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
        />
        <button
          type="button"
          disabled={!picked || upload.isPending}
          onClick={() => picked && upload.mutate(picked)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {upload.isPending ? 'Envoi…' : 'Envoyer vers le stockage'}
        </button>
        <p className="text-xs text-muted-foreground">
          {scoped
            ? 'Les fichiers sont liés automatiquement à cette fiche.'
            : 'Sans contexte, les fichiers sont rattachés au tenant uniquement ; utilisez une fiche deal, contact ou projet pour les lier.'}
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-medium text-sm">{libraryTitle}</div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
        ) : documents.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aucun document en base</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2">Fichier</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Contexte</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Ajouté</th>
                <th className="text-right px-4 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.filename}</p>
                        {d.description && (
                          <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {(d.size / 1024).toFixed(1)} Ko · {d.mimeType}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{ctx(d)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => download(d.id)}
                        className="p-2 rounded-lg hover:bg-muted"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate(d.id)}
                        disabled={remove.isPending}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
