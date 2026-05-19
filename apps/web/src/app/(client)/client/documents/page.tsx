'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FileText, Download, Eye, X } from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';

interface Document {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface PreviewState {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
}

export default function ClientDocumentsPage() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['client', 'documents'],
    queryFn: () => api.get('/client/documents') as Promise<Document[]>,
  });

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const result = (await api.get(`/client/documents/${docId}/signed-url`)) as { url: string };
      const link = document.createElement('a');
      link.href = result.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handlePreview = async (doc: Document) => {
    setPreviewLoadingId(doc.id);
    try {
      const result = (await api.get(`/client/documents/${doc.id}/signed-url`)) as { url: string };
      if (!result.url) throw new Error('Missing signed URL');
      setPreview({
        id: doc.id,
        filename: doc.filename,
        mimeType: doc.mimeType,
        url: result.url,
      });
    } catch {
      toast.error('Prévisualisation indisponible');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const isImagePreview = preview?.mimeType.startsWith('image/');
  const isPdfPreview = preview?.mimeType === 'application/pdf';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes documents</h1>
        <p className="text-muted-foreground">Documents partagés avec vous par l'équipe</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun document disponible pour l'instant</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
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
                  <iframe src={preview.url} title={preview.filename} className="w-full h-[70vh]" loading="lazy" />
                ) : isPdfPreview ? (
                  <iframe src={preview.url} title={preview.filename} className="w-full h-[70vh]" loading="lazy" />
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    Prévisualisation indisponible pour ce type de fichier. Utilisez "Ouvrir" ou "Télécharger".
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-4">
                <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(doc)}
                    disabled={previewLoadingId === doc.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Prévisualiser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.id, doc.filename)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
