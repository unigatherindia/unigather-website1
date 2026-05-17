export interface CountryOption {
  code: string;
  name: string;
  currency: string;
}

export const DEFAULT_COUNTRY_CODE = 'IN';
export const DEFAULT_CURRENCY = 'INR';

export const COUNTRIES: CountryOption[] = [
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom (Pound Sterling)', currency: 'GBP' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function resolveEventCurrency(data: {
  currency?: string;
  countryCode?: string;
}): string {
  if (data.currency) return data.currency;
  if (data.countryCode) {
    const country = getCountryByCode(data.countryCode);
    if (country) return country.currency;
  }
  return DEFAULT_CURRENCY;
}

export function resolveCountryCode(data: {
  countryCode?: string;
  country?: string;
}): string {
  if (data.countryCode && getCountryByCode(data.countryCode)) {
    return data.countryCode;
  }
  if (data.country) {
    const match = COUNTRIES.find(
      (c) => c.name.toLowerCase() === data.country!.toLowerCase()
    );
    if (match) return match.code;
  }
  return DEFAULT_COUNTRY_CODE;
}
