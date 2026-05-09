'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AccountOpt {
  id: string;
  name: string;
}

export function ContactCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [accountId, setAccountId] = useState('');

  const { data: accountsResp } = useQuery({
    queryKey: ['accounts', 'picklist'],
    queryFn: () =>
      api.get('/accounts?limit=100').then((r) => r as { data: AccountOpt[] }),
  });
  const accounts = accountsResp?.data ?? [];

  const create = useMutation({
    mutationFn: () => {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      return api.post('/contacts', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
        ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(linkedinUrl.trim() ? { linkedinUrl: linkedinUrl.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(tags.length ? { tags } : {}),
        ...(accountId ? { accountId } : {}),
      }) as Promise<{ id: string }>;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact créé');
      router.push(`/contacts/${res.id}`);
    },
    onError: () => toast.error('Création impossible — vérifiez les champs (e-mail valide si renseigné).'),
  });

  const disabled = !firstName.trim() || !lastName.trim() || create.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/contacts" className="text-sm text-primary hover:underline">
        ← Contacts
      </Link>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Prénom *</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Nom *</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">E-mail</label>
            <input
              type="email"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Téléphone</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Mobile</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Entreprise liée</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Fonction</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Service</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">LinkedIn</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
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
              <label className="text-sm font-medium block mb-1">Ville</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Pays</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tags (séparés par des virgules)</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="vip, decision-maker"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Notes internes</label>
          <textarea
            className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border bg-background"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/contacts"
            className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
          >
            Annuler
          </Link>
          <button
            type="button"
            disabled={disabled}
            onClick={() => create.mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {create.isPending ? 'Enregistrement…' : 'Créer le contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
