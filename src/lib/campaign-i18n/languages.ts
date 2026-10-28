export const CAMPAIGN_DEFAULT_LOCALE = 'en' as const;

export type CampaignLocale =
  | 'en'
  | 'es'
  | 'pt'
  | 'ar'
  | 'zh'
  | 'id'
  | 'fr'
  | 'ru'
  | 'ja'
  | 'de'
  | 'tr'
  | 'vi'
  | 'th'
  | 'ko'
  | 'bn';

export type CampaignLocaleOption = {
  code: CampaignLocale;
  label: string;
  nativeLabel: string;
  rtl?: boolean;
};

export const CAMPAIGN_LOCALE_OPTIONS: CampaignLocaleOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
  { code: 'zh', label: 'Chinese (Mandarin)', nativeLabel: '中文' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
];

export function isCampaignLocale(value: string): value is CampaignLocale {
  return CAMPAIGN_LOCALE_OPTIONS.some((o) => o.code === value);
}

export function campaignLocaleDirection(locale: CampaignLocale): 'ltr' | 'rtl' {
  return CAMPAIGN_LOCALE_OPTIONS.find((o) => o.code === locale)?.rtl ? 'rtl' : 'ltr';
}

/** BCP-47-ish codes for translation APIs */
export function campaignLocaleToApiLang(locale: CampaignLocale): string {
  const map: Record<CampaignLocale, string> = {
    en: 'en',
    es: 'es',
    pt: 'pt',
    ar: 'ar',
    zh: 'zh-CN',
    id: 'id',
    fr: 'fr',
    ru: 'ru',
    ja: 'ja',
    de: 'de',
    tr: 'tr',
    vi: 'vi',
    th: 'th',
    ko: 'ko',
    bn: 'bn',
  };
  return map[locale];
}
