import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/components/layout/query-provider';
import { SessionActivityManager } from '@/components/layout/session-activity-manager';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | CRM Africa First',
    default: 'CRM Africa First',
  },
  description: 'CRM SaaS — Gestion clients, projets et automatisations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProvider>
            <SessionActivityManager />
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
