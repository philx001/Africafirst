'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function TicketQuickCreate() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post('/tickets', { title: title.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket créé');
    },
    onError: () => toast.error('Impossible de créer le ticket'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Plus className="w-4 h-4" />
        Nouveau ticket
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Objet"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background sm:col-span-2"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending || !title.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Créer
        </button>
      </div>
    </form>
  );
}
