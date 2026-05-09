import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!date) return '—';
  return format(new Date(date), pattern, { locale: fr });
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatCurrency(value: number | null | undefined, currency = 'EUR') {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(value));
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(firstName?: string | null, lastName?: string | null) {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '?';
}
