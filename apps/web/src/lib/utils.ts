import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '@crm/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function readOrgDisplayLocale(): (typeof SUPPORTED_LOCALES)[number] {
  if (typeof window === 'undefined') return 'fr-FR';
  const raw = window.localStorage.getItem('crm:defaultLocale');
  return raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as 'fr-FR' | 'en-US') : 'fr-FR';
}

function readOrgDisplayCurrency(): (typeof SUPPORTED_CURRENCIES)[number] {
  if (typeof window === 'undefined') return 'EUR';
  const raw = window.localStorage.getItem('crm:defaultCurrency');
  return raw && (SUPPORTED_CURRENCIES as readonly string[]).includes(raw) ? (raw as 'EUR' | 'USD' | 'XOF') : 'EUR';
}

export function formatDate(date: Date | string | null | undefined, pattern?: string) {
  if (!date) return '—';
  const locale = readOrgDisplayLocale();
  const dateFnsLocale = locale === 'en-US' ? enUS : fr;
  const fallbackPattern = locale === 'en-US' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
  return format(new Date(date), pattern ?? fallbackPattern, { locale: dateFnsLocale });
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return '—';
  const locale = readOrgDisplayLocale();
  const dateFnsLocale = locale === 'en-US' ? enUS : fr;
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateFnsLocale });
}

export function formatCurrency(value: number | null | undefined, currency = 'EUR') {
  if (value == null) return '—';
  const locale = readOrgDisplayLocale();
  const fallbackCurrency = readOrgDisplayCurrency();
  const safeCurrency =
    (SUPPORTED_CURRENCIES as readonly string[]).includes(currency) ? currency : fallbackCurrency;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: safeCurrency }).format(Number(value));
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
