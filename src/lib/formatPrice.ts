import { DEFAULT_CURRENCY } from '@/constants/countries';

const SOLD_OUT_PATTERN = /^(sold\s*out|soldout|sold-out)$/i;

function isPlainNumericString(value: string): boolean {
  const cleaned = value.replace(/,/g, '').trim();
  return /^\d+(\.\d+)?$/.test(cleaned);
}

function parsePlainNumber(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').trim();
  if (!isPlainNumericString(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function formatNumericPrice(amount: number, currency: string = DEFAULT_CURRENCY): string {
  try {
    const locale =
      currency === 'INR' ? 'en-IN' : currency === 'CAD' ? 'en-CA' : 'en';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Short symbol or code for admin field labels (e.g. CA$, ₹, $). */
export function getCurrencyLabel(currency: string = DEFAULT_CURRENCY): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1);
    const symbol = parts.find((p) => p.type === 'currency')?.value;
    return symbol?.trim() || currency;
  } catch {
    return currency;
  }
}

export function formatEventPrice(
  value: number | string,
  currency: string = DEFAULT_CURRENCY
): string {
  if (value === undefined || value === null) return '';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return formatNumericPrice(value, currency);
  }

  const trimmed = String(value).trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower === 'n/a' || SOLD_OUT_PATTERN.test(lower)) {
    return trimmed;
  }

  const asNumber = parsePlainNumber(trimmed);
  if (asNumber !== undefined) {
    return formatNumericPrice(asNumber, currency);
  }

  return trimmed;
}
