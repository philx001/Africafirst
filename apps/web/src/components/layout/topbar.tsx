'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatRelative } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

export function TopBar({ user: _user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count') as Promise<number>,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?unreadOnly=true') as Promise<Array<{
      id: string;
      title: string;
      body?: string | null;
      createdAt: string;
      readAt?: string | null;
    }>>,
    enabled: showNotifications,
  });

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="h-16 border-b bg-background flex items-center gap-4 px-6">
      {/* Recherche globale */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher contacts, deals, projets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="text-sm font-semibold">Notifications</p>
                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/notifications/read-all');
                    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Tout marquer comme lu
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Aucune notification</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-muted/30 transition-colors border-0 bg-transparent cursor-pointer"
                      onClick={async () => {
                        try {
                          await api.patch(`/notifications/${n.id}/read`);
                          await queryClient.invalidateQueries({ queryKey: ['notifications'] });
                          await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
                        } catch {
                          /* ignore */
                        }
                      }}
                      title="Marquer comme lu"
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatRelative(n.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
