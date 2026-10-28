'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { CAMPAIGN_LOCALE_OPTIONS } from '@/lib/campaign-i18n/languages';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';

export default function CampaignLanguageSelect() {
  const { locale, setLocale, messages, isUiTranslating } = useCampaignLocale();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-primary-400 shrink-0" aria-hidden />
      <label className="sr-only" htmlFor="campaign-language">
        {messages.languageLabel}
      </label>
      <select
        id="campaign-language"
        value={locale}
        disabled={isUiTranslating}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="min-w-[9.5rem] max-w-[11rem] sm:max-w-none sm:min-w-[11rem] pl-3 pr-8 py-2 rounded-xl text-sm font-medium bg-black/40 border border-white/10 text-gray-100 focus:outline-none focus:border-primary-400/50 focus:ring-2 focus:ring-primary-500/20 appearance-none cursor-pointer disabled:opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.65rem center',
        }}
      >
        {CAMPAIGN_LOCALE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code} className="bg-dark-900 text-white">
            {opt.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
