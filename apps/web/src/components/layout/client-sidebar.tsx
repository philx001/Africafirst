'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, FileText, MessageSquare, LogOut, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navigation = [
  { name: 'Mon espace', href: '/client/dashboard', icon: LayoutDashboard },
  { name: 'Mes projets', href: '/client/projects', icon: FolderKanban },
  { name: 'Contrats & signatures', href: '/client/contracts', icon: FileSignature },
  { name: 'Documents', href: '/client/documents', icon: FileText },
  { name: 'Messages', href: '/client/messages', icon: MessageSquare },
];

export function ClientSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-white" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">Mon Espace</p>
          <p className="text-xs text-sidebar-foreground/50">Portail client</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/50">Client</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
