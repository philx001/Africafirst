'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: { firstName?: string; lastName?: string; avatarUrl?: string };
}

export default function ClientMessagesPage() {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['client', 'messages'],
    queryFn: () => api.get('/client/messages').then((r: unknown) => (r as { data: Message[] }).data),
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post('/client/messages', { content }),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['client', 'messages'] });
    },
    onError: () => toast.error('Erreur lors de l\'envoi du message'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <div className="max-w-2xl h-full flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messagerie</h1>
        <p className="text-muted-foreground">Échangez directement avec notre équipe</p>
      </div>

      <div className="flex-1 rounded-xl border bg-card flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Commencez la conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {msg.sender.firstName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelative(msg.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm bg-muted rounded-xl rounded-tl-sm px-3 py-2 inline-block max-w-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="border-t p-4 flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 px-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
