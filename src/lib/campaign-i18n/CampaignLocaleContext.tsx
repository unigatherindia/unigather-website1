'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CAMPAIGN_DEFAULT_LOCALE,
  campaignLocaleDirection,
  isCampaignLocale,
  type CampaignLocale,
} from '@/lib/campaign-i18n/languages';
import type { CampaignMessages } from '@/lib/campaign-i18n/messages-types';
import { EN_CAMPAIGN_MESSAGES } from '@/lib/campaign-i18n/messages-en';

const STORAGE_KEY = 'unigatherCampaignLocale';

type ContextValue = {
  locale: CampaignLocale;
  setLocale: (locale: CampaignLocale) => void;
  messages: CampaignMessages;
  isUiTranslating: boolean;
  dir: 'ltr' | 'rtl';
  translateDynamic: (text: string) => Promise<string>;
};

const CampaignLocaleContext = createContext<ContextValue | null>(null);

function readStoredLocale(): CampaignLocale {
  if (typeof window === 'undefined') return CAMPAIGN_DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isCampaignLocale(stored)) return stored;
  return CAMPAIGN_DEFAULT_LOCALE;
}

export function CampaignLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<CampaignLocale>(CAMPAIGN_DEFAULT_LOCALE);
  const [messages, setMessages] = useState<CampaignMessages>(EN_CAMPAIGN_MESSAGES);
  const [isUiTranslating, setIsUiTranslating] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const loadUiMessages = useCallback(async (next: CampaignLocale) => {
    if (next === 'en') {
      setMessages(EN_CAMPAIGN_MESSAGES);
      return;
    }

    const cacheKey = `campaign-ui-messages-${next}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setMessages(JSON.parse(cached) as CampaignMessages);
        return;
      }
    } catch {
      /* ignore */
    }

    setIsUiTranslating(true);
    try {
      const response = await fetch('/api/campaign/translate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      const data = (await response.json()) as { messages?: CampaignMessages; error?: string };
      if (data.messages) {
        setMessages(data.messages);
        sessionStorage.setItem(cacheKey, JSON.stringify(data.messages));
      } else {
        setMessages(EN_CAMPAIGN_MESSAGES);
      }
    } catch (error) {
      console.error('Campaign UI translate:', error);
      setMessages(EN_CAMPAIGN_MESSAGES);
    } finally {
      setIsUiTranslating(false);
    }
  }, []);

  useEffect(() => {
    loadUiMessages(locale);
  }, [locale, loadUiMessages]);

  const setLocale = useCallback((next: CampaignLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const translateDynamic = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || locale === 'en') return text;
      const cacheKey = `campaign-dyn-${locale}-${trimmed.slice(0, 48)}-${trimmed.length}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return cached;
      } catch {
        /* ignore */
      }
      try {
        const response = await fetch('/api/campaign/translate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, locale }),
        });
        const data = (await response.json()) as { text?: string };
        const translated = data.text?.trim() || text;
        sessionStorage.setItem(cacheKey, translated);
        return translated;
      } catch {
        return text;
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
      isUiTranslating,
      dir: campaignLocaleDirection(locale),
      translateDynamic,
    }),
    [locale, setLocale, messages, isUiTranslating, translateDynamic]
  );

  return <CampaignLocaleContext.Provider value={value}>{children}</CampaignLocaleContext.Provider>;
}

export function useCampaignLocale() {
  const ctx = useContext(CampaignLocaleContext);
  if (!ctx) {
    throw new Error('useCampaignLocale must be used within CampaignLocaleProvider');
  }
  return ctx;
}
