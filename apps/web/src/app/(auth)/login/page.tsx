import type { Metadata } from 'next';
import { LoginForm } from '@/components/crm/auth/login-form';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <div className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 mb-4">
            <svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              className="shrink-0 text-white"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Africa First</h1>
          <p className="mt-2 text-slate-400">Connectez-vous à votre espace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
