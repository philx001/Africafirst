'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ACCOUNT_INDUSTRIES, CONTACT_JOB_TITLES, COUNTRY_OPTIONS, PHONE_DIAL_CODES } from '@crm/shared';
import { api } from '@/lib/api';
import { formatPhoneForStorage } from '@/lib/phone';
import { toast } from 'sonner';

interface ContactOpt {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

export function AccountCreateForm() {
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
  const [contactLinkMode, setContactLinkMode] = useState<'none' | 'existing' | 'new'>('none');
  const [existingContactId, setExistingContactId] = useState('');
  const [newContactFirstName, setNewContactFirstName] = useState('');
  const [newContactLastName, setNewContactLastName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhoneDialCode, setNewContactPhoneDialCode] = useState('+33');
  const [newContactPhoneLocal, setNewContactPhoneLocal] = useState('');
  const [newContactJobTitleSelection, setNewContactJobTitleSelection] = useState('');
  const [newContactJobTitleOther, setNewContactJobTitleOther] = useState('');
  const [newContactCountry, setNewContactCountry] = useState('');
  const [newContactDepartment, setNewContactDepartment] = useState('');

  const { data: contactsResp } = useQuery({
    queryKey: ['contacts', 'picklist', 'account-create'],
    queryFn: () => api.get('/contacts?limit=100') as Promise<{ data: ContactOpt[] }>,
  });
  const contacts = contactsResp?.data ?? [];

  const create = useMutation({
    mutationFn: async () => {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const employeeCount =
        employeeCountRaw.trim().length > 0 ? Number.parseInt(employeeCountRaw.trim(), 10) : undefined;
      const industry =
        industrySelection === 'autre'
          ? industryOther.trim()
          : industrySelection.trim();
      const phone = formatPhoneForStorage(phoneDialCode, phoneLocal);
      const newContactPhone = formatPhoneForStorage(newContactPhoneDialCode, newContactPhoneLocal);
      const newContactJobTitle =
        newContactJobTitleSelection === 'other'
          ? newContactJobTitleOther.trim()
          : newContactJobTitleSelection.trim();

      const account = (await api.post('/accounts', {
        name: name.trim(),
        ...(industry ? { industry } : {}),
        ...(website.trim() ? { website: website.trim() } : {}),
        email: email.trim(),
        phone,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        country: country.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(tags.length ? { tags } : {}),
        ...(employeeCount !== undefined && !Number.isNaN(employeeCount) ? { employeeCount } : {}),
      })) as { id: string };

      if (contactLinkMode === 'existing' && existingContactId) {
        await api.put(`/contacts/${existingContactId}`, { accountId: account.id });
      }

      if (contactLinkMode === 'new') {
        await api.post('/contacts', {
          firstName: newContactFirstName.trim(),
          lastName: newContactLastName.trim(),
          email: newContactEmail.trim(),
          phone: newContactPhone,
          jobTitle: newContactJobTitle,
          department: newContactDepartment.trim(),
          country: newContactCountry.trim(),
          accountId: account.id,
        });
      }

      return { accountId: account.id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Entreprise créée et liaison contact enregistrée');
      router.push(`/accounts/${res.accountId}`);
    },
    onError: () => toast.error('Création impossible — vérifie les champs entreprise/contact.'),
  });

  const missingIndustry =
    industrySelection === 'autre' && !industryOther.trim();
  const missingExistingContact =
    contactLinkMode === 'existing' && !existingContactId;
  const missingNewContactName =
    contactLinkMode === 'new' && (!newContactFirstName.trim() || !newContactLastName.trim());
  const disabled =
    !name.trim() ||
    !email.trim() ||
    !phoneLocal.trim() ||
    !country.trim() ||
    !industrySelection.trim() ||
    missingIndustry ||
    missingExistingContact ||
    missingNewContactName ||
    (contactLinkMode === 'new' &&
      (!newContactEmail.trim() ||
        !newContactPhoneLocal.trim() ||
        !newContactCountry.trim() ||
        !newContactDepartment.trim() ||
        !newContactJobTitleSelection.trim() ||
        (newContactJobTitleSelection === 'other' && !newContactJobTitleOther.trim()))) ||
    create.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/accounts" className="text-sm text-primary hover:underline">
        ← Entreprises
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
            <label className="text-sm font-medium block mb-1">Secteur</label>
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

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Contact lié à l'entreprise</h2>
          <select
            className="w-full sm:w-[320px] px-3 py-2 text-sm rounded-lg border bg-background"
            value={contactLinkMode}
            onChange={(e) => setContactLinkMode(e.target.value as 'none' | 'existing' | 'new')}
          >
            <option value="none">Aucun pour l'instant</option>
            <option value="existing">Lier un contact existant</option>
            <option value="new">Créer un nouveau contact maintenant</option>
          </select>

          {contactLinkMode === 'existing' && (
            <div>
              <label className="text-sm font-medium block mb-1">Contact existant *</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                value={existingContactId}
                onChange={(e) => setExistingContactId(e.target.value)}
              >
                <option value="">— Choisir un contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.email ? ` · ${c.email}` : ''}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Aucun contact existant. Choisis "Créer un nouveau contact maintenant".
                </p>
              )}
            </div>
          )}

          {contactLinkMode === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Prénom *</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactFirstName}
                  onChange={(e) => setNewContactFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nom *</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactLastName}
                  onChange={(e) => setNewContactLastName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">E-mail *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Téléphone *</label>
                <div className="grid grid-cols-[150px_1fr] gap-2">
                  <select
                    className="w-full px-2 py-2 text-sm rounded-lg border bg-background"
                    value={newContactPhoneDialCode}
                    onChange={(e) => setNewContactPhoneDialCode(e.target.value)}
                  >
                    {PHONE_DIAL_CODES.map((opt) => (
                      <option key={`${opt.code}-${opt.dialCode}`} value={opt.dialCode}>
                        {opt.dialCode} · {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                    value={newContactPhoneLocal}
                    onChange={(e) => setNewContactPhoneLocal(e.target.value)}
                    placeholder="Numéro (sans indicatif)"
                    required
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Fonction *</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactJobTitleSelection}
                  onChange={(e) => setNewContactJobTitleSelection(e.target.value)}
                  required
                >
                  <option value="">— Sélectionner une fonction —</option>
                  {CONTACT_JOB_TITLES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {newContactJobTitleSelection === 'other' && (
                  <input
                    className="w-full mt-2 px-3 py-2 text-sm rounded-lg border bg-background"
                    value={newContactJobTitleOther}
                    onChange={(e) => setNewContactJobTitleOther(e.target.value)}
                    placeholder="Préciser la fonction"
                    required
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Pays *</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactCountry}
                  onChange={(e) => setNewContactCountry(e.target.value)}
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
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Secteur d'activité *</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  value={newContactDepartment}
                  onChange={(e) => setNewContactDepartment(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/accounts" className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
            Annuler
          </Link>
          <button
            type="button"
            disabled={disabled}
            onClick={() => create.mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {create.isPending ? 'Enregistrement…' : 'Créer l’entreprise'}
          </button>
        </div>
      </div>
    </div>
  );
}
