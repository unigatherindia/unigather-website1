/** Normalize to digits only; strip leading 91 for 10-digit Indian mobiles. */
export function indianMobileDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/** Display e.g. +91 7901751593 */
export function formatIndianPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  const digits = indianMobileDigits(trimmed);
  if (digits.length === 10) return `+91 ${digits}`;
  if (trimmed.startsWith('+')) return trimmed;
  return trimmed;
}

export function telHrefIndian(phone: string): string {
  const digits = indianMobileDigits(phone);
  if (digits.length === 10) return `tel:+91${digits}`;
  const raw = phone.replace(/\s/g, '');
  return raw.startsWith('tel:') ? raw : `tel:${raw}`;
}

export function whatsappHrefIndian(phone: string): string {
  const digits = indianMobileDigits(phone);
  const normalized = digits.length === 10 ? `91${digits}` : digits.replace(/\D/g, '');
  return normalized ? `https://wa.me/${normalized}` : '';
}
