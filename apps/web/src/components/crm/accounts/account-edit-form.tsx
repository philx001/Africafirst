'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ACCOUNT_INDUSTRIES, COUNTRY_OPTIONS, PHONE_DIAL_CODES } from '@crm/shared';
import { api } from '@/lib/api';
import { formatPhoneForStorage, splitStoredPhone } from '@/lib/phone';
import { toast } from 'sonner';

interface AccountData {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  employeeCount?: number | null;
  description?: string | null;
  tags?: string[];
}

export function AccountEditForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [industrySelection, setIndustrySelection] = useState('');
  const [industryOther, setIndustryOther] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('+33');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [employeeCountRaw, setEmployeeCountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');

  const { data: account, isLoading, isError } = useQuery({
    queryKey: ['accounts', accountId, 'edit'],
    queryFn: () => api.get(`/accounts/${accountId}`) as Promise<AccountData>,
  });

  useEffect(() => {
    if (!account) return;
    const selectableIndustries = ACCOUNT_INDUSTRIES.map((x) => x.id).filter((id) => id !== 'autre');
    const currentIndustry = account.industry ?? '';
    const isKnownIndustry = selectableIndustries.includes(currentIndustry);

    setName(account.name ?? '');
    setIndustrySelection(
      currentIndustry ? (isKnownIndustry ? currentIndustry : 'autre') : '',
    );
    setIndustryOther(currentIndustry && !isKnownIndustry ? currentIndustry : '');
    setWebsite(account.website ?? '');
    setEmail(account.email ?? '');
    const parsedPhone = splitStoredPhone(account.phone, '+33');
    setPhoneDialCode(parsedPhone.dialCode);
    setPhoneLocal(parsedPhone.localNumber);
    setAddress(account.address ?? '');
    setCity(account.city ?? '');
    setCountry(account.country ?? '');
    setEmployeeCountRaw(
      account.employeeCount !== undefined && account.employeeCount !== null
        ? String(account.employeeCount)
        : '',
    );
    setDescription(account.description ?? '');
    setTagsRaw((account.tags ?? []).join(', '));
  }, [account]);

  const update = useMutation({
    mutationFn: () => {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const industry =
        industrySelection === 'autre'
          ? industryOther.trim()
          : industrySelection.trim();
      const phone = formatPhoneForStorage(phoneDialCode, phoneLocal);
      const employeeCount =
        employeeCountRaw.trim().length > 0 ? Number.parseInt(employeeCountRaw.trim(), 10) : null;

      return api.put(`/accounts/${accountId}`, {
        name: name.trim(),
        ...(industry ? { industry } : { industry: null }),
        ...(website.trim() ? { website: website.trim() } : { website: null }),
        email: email.trim(),
        phone,
        ...(address.trim() ? { address: address.trim() } : { address: null }),
        ...(city.trim() ? { city: city.trim() } : { city: null }),
        country: country.trim(),
        ...(description.trim() ? { description: description.trim() } : { description: null }),
        ...(Number.isNaN(employeeCount as number) ? { employeeCount: null } : { employeeCount }),
        tags,
      }) as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
      toast.success('Entreprise mise à jour');
      router.push(`/accounts/${accountId}`);
    },
    onError: () => toast.error('Mise à jour impossible — vérifiez les champs.'),
  });

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse max-w-2xl" />;
  }

  if (isError || !account) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm max-w-3xl">
        <p className="font-medium text-destructive">Entreprise introuvable ou accès refusé.</p>
        <Link href={`/accounts/${accountId}`} className="text-primary hover:underline mt-2 inline-block">
          ← Retour à la fiche
        </Link>
      </div>
    );
  }

  const disabled =
    !name.trim() ||
    !email.trim() ||
    !phoneLocal.trim() ||
    !country.trim() ||
    !industrySelection.trim() ||
    (industrySelection === 'autre' && !industryOther.trim()) ||
    update.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/accounts/${accountId}`} className="text-sm text-primary hover:underline">
        ← Fiche entreprise
      </Link>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Nom *</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Secteur *</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={industrySelection}
              onChange={(e) => setIndustrySelection(e.target.value)}
            >
              <option value="">— Sélectionner un secteur —</option>
              {ACCOUNT_INDUSTRIES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {industrySelection === 'autre' && (
              <input
                className="w-full mt-2 px-3 py-2 text-sm rounded-lg border bg-background"
                placeholder="Préciser le secteur"
                value={industryOther}
                onChange={(e) => setIndustryOther(e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Site web</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">E-mail *</label>
            <input
              type="email"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Téléphone *</label>
            <div className="grid grid-cols-[150px_1fr] gap-2">
              <select
                className="w-full px-2 py-2 text-sm rounded-lg border bg-background"
                value={phoneDialCode}
                onChange={(e) => setPhoneDialCode(e.target.value)}
              >
                {PHONE_DIAL_CODES.map((opt) => (
                  <option key={`${opt.code}-${opt.dialCode}`} value={opt.dialCode}>
                    {opt.dialCode} · {opt.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder="Numéro (sans indicatif)"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Ville</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Pays *</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="">— Sélectionner un pays —</option>
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Adresse</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Effectif</label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={employeeCountRaw}
              onChange={(e) => setEmployeeCountRaw(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Tags (virgules)</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="enterprise, partner"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <textarea
            className="w-full min-h-[110px] px-3 py-2 text-sm rounded-lg border bg-background"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href={`/accounts/${accountId}`}
            className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
          >
            Annuler
          </Link>
          <button
            type="button"
            disabled={disabled}
            onClick={() => update.mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
