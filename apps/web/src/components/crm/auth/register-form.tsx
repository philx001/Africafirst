'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  organizationName: z.string().min(2, 'Nom de l\'organisation requis'),
  organizationSlug: z
    .string()
    .min(3, 'Minimum 3 caractères')
    .regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('organizationName', value);
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setValue('organizationSlug', slug);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', data);
      toast.success('Compte créé ! Vous pouvez maintenant vous connecter.');
      router.push('/login');
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || 'Erreur lors de la création du compte';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full px-4 py-2.5 rounded-lg bg-white/10 border text-white placeholder-slate-400',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      hasError ? 'border-red-400' : 'border-white/20',
    );

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Prénom</label>
            <input {...register('firstName')} placeholder="Jean" className={inputClass(!!errors.firstName)} />
            {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Nom</label>
            <input {...register('lastName')} placeholder="Dupont" className={inputClass(!!errors.lastName)} />
            {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Email</label>
          <input {...register('email')} type="email" placeholder="vous@exemple.com" className={inputClass(!!errors.email)} />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Mot de passe</label>
          <input {...register('password')} type="password" placeholder="••••••••" className={inputClass(!!errors.password)} />
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
        </div>

        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-slate-400 mb-3">Informations de votre organisation</p>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Nom de l'organisation</label>
            <input
              {...register('organizationName')}
              onChange={handleOrgNameChange}
              placeholder="Africa First Agency"
              className={inputClass(!!errors.organizationName)}
            />
            {errors.organizationName && <p className="mt-1 text-sm text-red-400">{errors.organizationName.message}</p>}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Identifiant URL <span className="text-slate-400 text-xs">(auto-généré)</span>
            </label>
            <input {...register('organizationSlug')} placeholder="africa-first-agency" className={inputClass(!!errors.organizationSlug)} />
            {errors.organizationSlug && <p className="mt-1 text-sm text-red-400">{errors.organizationSlug.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg mt-2',
            'bg-blue-600 hover:bg-blue-700 text-white font-medium',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        Déjà un compte ?{' '}
        <a href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Se connecter</a>
      </p>
    </div>
  );
}
