import { PHONE_DIAL_CODES } from '@crm/shared';

const DIAL_CODES_BY_LENGTH = [...PHONE_DIAL_CODES]
  .map((entry) => entry.dialCode)
  .sort((a, b) => b.length - a.length);

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function splitStoredPhone(raw?: string | null, fallbackDialCode = '+33') {
  const source = (raw ?? '').trim();
  if (!source) return { dialCode: fallbackDialCode, localNumber: '' };

  const normalized = source.startsWith('+') ? source : `+${digitsOnly(source)}`;
  for (const dialCode of DIAL_CODES_BY_LENGTH) {
    if (normalized.startsWith(dialCode)) {
      return {
        dialCode,
        localNumber: normalized.slice(dialCode.length).replace(/^\s+/, ''),
      };
    }
  }

  return { dialCode: fallbackDialCode, localNumber: digitsOnly(source) };
}

export function formatPhoneForStorage(dialCode: string, localNumber: string) {
  const localDigits = digitsOnly(localNumber).replace(/^0+/, '');
  return `${dialCode}${localDigits}`;
}
