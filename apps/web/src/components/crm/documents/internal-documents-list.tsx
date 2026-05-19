'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Download, Eye, FileText, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useRef, useState } from 'react';

interface DocRow {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  description?: string;
  dealId?: string | null;
  projectId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  ticketId?: string | null;
  createdAt: string;
}

interface DocumentPreviewState {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
}

type LinkedToFilter = 'all' | 'deal' | 'project' | 'contact' | 'account' | 'ticket' | 'unlinked';
type MimeFilter = 'all' | 'application/pdf' | 'image/' | 'text/' | 'application/vnd';
type SortFilter = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

function DocumentContextLinks({ d }: { d: DocRow }) {
  const items: { href: string; label: string }[] = [];
  if (d.dealId) items.push({ href: `/deals/${d.dealId}`, label: 'Deal' });
  if (d.projectId) items.push({ href: `/projects/${d.projectId}`, label: 'Projet' });
  if (d.contactId) items.push({ href: `/contacts/${d.contactId}`, label: 'Contact' });
  if (d.accountId) items.push({ href: `/accounts/${d.accountId}`, label: 'Entreprise' });
  if (d.ticketId) items.push({ href: `/tickets/${d.ticketId}`, label: 'Ticket' });
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs">
      {items.map((item, i) => (
        <span key={`${item.label}-${item.href}`} className="inline-flex items-center gap-x-2">
          {i > 0 ? <span className="text-muted-foreground">·</span> : null}
          <Link href={item.href} className="text-primary hover:underline">
            {item.label}
          </Link>
        </span>
      ))}
    </span>
  );
}

export function InternalDocumentsList({
  dealId,
  contactId,
  projectId,
  accountId,
  ticketId,
  libraryTitle = 'Bibliothèque',
}: {
  dealId?: string;
  contactId?: string;
  projectId?: string;
  accountId?: string;
  ticketId?: string;
  libraryTitle?: string;
} = {}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [desc, setDesc] = useState('');
  const [picked, setPicked] = useState<File | null>(null);
  const [filter, setFilter] = useState('');
  const [linkedTo, setLinkedTo] = useState<LinkedToFilter>('all');
  const [mimePrefix, setMimePrefix] = useState<MimeFilter>('all');
  const [sort, setSort] = useState<SortFilter>('newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<DocumentPreviewState | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const scoped = Boolean(dealId || contactId || projectId || accountId || ticketId);
  const qs = new URLSearchParams();
  if (dealId) qs.set('dealId', dealId);
  if (contactId) qs.set('contactId', contactId);
  if (projectId) qs.set('projectId', projectId);
  if (accountId) qs.set('accountId', accountId);
  if (ticketId) qs.set('ticketId', ticketId);
  if (filter.trim()) qs.set('q', filter.trim());
  if (linkedTo !== 'all') qs.set('linkedTo', linkedTo);
  if (mimePrefix !== 'all') qs.set('mimePrefix', mimePrefix);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  qs.set('sort', sort);
  const listSuffix = qs.toString() ? `?${qs}` : '';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: [
      'documents',
      'internal',
      dealId ?? null,
      contactId ?? null,
      projectId ?? null,
      accountId ?? null,
      ticketId ?? null,
      filter,
      linkedTo,
      mimePrefix,
      from,
      to,
      sort,
    ],
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
      if (accountId) form.append('accountId', accountId);
      if (ticketId) form.append('ticketId', ticketId);
      return api.post('/documents/upload', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'timeline'] });
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
      queryClient.invalidateQueries({ queryKey: ['documents', 'timeline'] });
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

  const openPreview = async (doc: DocRow) => {
    setPreviewLoadingId(doc.id);
    try {
      const res = (await api.get(`/documents/${doc.id}/signed-url`)) as { url: string };
      if (!res.url) throw new Error('Missing signed URL');
      setPreview({
        id: doc.id,
        filename: doc.filename,
        mimeType: doc.mimeType,
        url: res.url,
      });
    } catch {
      toast.error('Prévisualisation impossible');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const isImagePreview = preview?.mimeType.startsWith('image/');
  const isPdfPreview = preview?.mimeType === 'application/pdf';

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (Number.isFinite(d.size) ? d.size : 0), 0),
    [documents],
  );

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
            : 'Centre documentaire du tenant ; ouvrez un deal, un projet ou un ticket pour rattacher automatiquement les fichiers.'}
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="font-medium text-sm">{libraryTitle}</p>
              <p className="text-xs text-muted-foreground">
                {documents.length} document{documents.length > 1 ? 's' : ''} · {formatSize(totalSize)}
              </p>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer les documents..."
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <select
              value={linkedTo}
              onChange={(e) => setLinkedTo(e.target.value as LinkedToFilter)}
              className="rounded-lg border bg-background py-2 px-3 text-sm"
            >
              <option value="all">Tous contextes</option>
              <option value="deal">Liés à deal</option>
              <option value="project">Liés à projet</option>
              <option value="contact">Liés à contact</option>
              <option value="account">Liés à entreprise</option>
              <option value="ticket">Liés à ticket</option>
              <option value="unlinked">Sans contexte</option>
            </select>
            <select
              value={mimePrefix}
              onChange={(e) => setMimePrefix(e.target.value as MimeFilter)}
              className="rounded-lg border bg-background py-2 px-3 text-sm"
            >
              <option value="all">Tous types MIME</option>
              <option value="application/pdf">PDF</option>
              <option value="image/">Images</option>
              <option value="text/">Texte</option>
              <option value="application/vnd">Office</option>
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border bg-background py-2 px-3 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border bg-background py-2 px-3 text-sm"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortFilter)}
              className="rounded-lg border bg-background py-2 px-3 text-sm"
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="name_asc">Nom A→Z</option>
              <option value="name_desc">Nom Z→A</option>
              <option value="size_desc">Taille décroissante</option>
              <option value="size_asc">Taille croissante</option>
            </select>
          </div>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
        ) : documents.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aucun document en base</p>
        ) : (
          <>
            {preview ? (
              <div className="border-b bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{preview.filename}</p>
                    <p className="text-xs text-muted-foreground">{preview.mimeType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
                      className="text-xs px-3 py-1.5 rounded-md border hover:bg-background"
                    >
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="p-2 rounded-lg hover:bg-background"
                      title="Fermer la prévisualisation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border bg-background overflow-hidden">
                  {isImagePreview ? (
                    <iframe
                      src={preview.url}
                      title={preview.filename}
                      className="w-full h-[70vh]"
                      loading="lazy"
                    />
                  ) : isPdfPreview ? (
                    <iframe
                      src={preview.url}
                      title={preview.filename}
                      className="w-full h-[70vh]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-6 text-sm text-muted-foreground">
                      Prévisualisation indisponible pour ce type de fichier. Utilisez "Ouvrir" ou "Télécharger".
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2">Fichier</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Contexte</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Ajouté</th>
                  <th className="text-right px-4 py-2 w-40">Actions</th>
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
                            {formatSize(d.size)} · {d.mimeType}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      <DocumentContextLinks d={d} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openPreview(d)}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="Prévisualiser"
                          disabled={previewLoadingId === d.id}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          </>
        )}
      </div>
    </div>
  );
}
