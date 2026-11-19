'use client';

import { useEffect, useState } from 'react';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';

type TranslatedCopySource = {
  promoText: string;
  formIntro: string;
  enrollmentSuccessMessage: string;
  /** Optional male-page overrides (strangers group only). */
  malePromoText?: string;
  maleFormIntro?: string;
  maleUrgencyText?: string;
  maleQueryCtaLabel?: string;
  maleRegisterCtaLabel?: string;
};

export function useTranslatedCopy(source: TranslatedCopySource) {
  const { locale, translateDynamic } = useCampaignLocale();
  const [promoText, setPromoText] = useState(source.promoText);
  const [formIntro, setFormIntro] = useState(source.formIntro);
  const [enrollmentSuccessMessage, setEnrollmentSuccessMessage] = useState(
    source.enrollmentSuccessMessage
  );
  const [malePromoText, setMalePromoText] = useState(source.malePromoText ?? '');
  const [maleFormIntro, setMaleFormIntro] = useState(source.maleFormIntro ?? '');
  const [maleUrgencyText, setMaleUrgencyText] = useState(source.maleUrgencyText ?? '');
  const [maleQueryCtaLabel, setMaleQueryCtaLabel] = useState(source.maleQueryCtaLabel ?? '');
  const [maleRegisterCtaLabel, setMaleRegisterCtaLabel] = useState(
    source.maleRegisterCtaLabel ?? ''
  );
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const male = {
      promoText: source.malePromoText ?? '',
      formIntro: source.maleFormIntro ?? '',
      urgencyText: source.maleUrgencyText ?? '',
      queryCtaLabel: source.maleQueryCtaLabel ?? '',
      registerCtaLabel: source.maleRegisterCtaLabel ?? '',
    };

    const run = async () => {
      if (locale === 'en') {
        setPromoText(source.promoText);
        setFormIntro(source.formIntro);
        setEnrollmentSuccessMessage(source.enrollmentSuccessMessage);
        setMalePromoText(male.promoText);
        setMaleFormIntro(male.formIntro);
        setMaleUrgencyText(male.urgencyText);
        setMaleQueryCtaLabel(male.queryCtaLabel);
        setMaleRegisterCtaLabel(male.registerCtaLabel);
        return;
      }

      setIsTranslating(true);
      try {
        const translateIfPresent = (value: string) =>
          value.trim() ? translateDynamic(value) : Promise.resolve('');

        const [
          promo,
          intro,
          success,
          translatedMalePromo,
          translatedMaleIntro,
          translatedMaleUrgency,
          translatedMaleQueryLabel,
          translatedMaleRegisterLabel,
        ] = await Promise.all([
          translateDynamic(source.promoText),
          translateIfPresent(source.formIntro),
          translateIfPresent(source.enrollmentSuccessMessage),
          translateIfPresent(male.promoText),
          translateIfPresent(male.formIntro),
          translateIfPresent(male.urgencyText),
          translateIfPresent(male.queryCtaLabel),
          translateIfPresent(male.registerCtaLabel),
        ]);
        if (!cancelled) {
          setPromoText(promo);
          setFormIntro(intro);
          setEnrollmentSuccessMessage(success);
          setMalePromoText(translatedMalePromo);
          setMaleFormIntro(translatedMaleIntro);
          setMaleUrgencyText(translatedMaleUrgency);
          setMaleQueryCtaLabel(translatedMaleQueryLabel);
          setMaleRegisterCtaLabel(translatedMaleRegisterLabel);
        }
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    locale,
    source.promoText,
    source.formIntro,
    source.enrollmentSuccessMessage,
    source.malePromoText,
    source.maleFormIntro,
    source.maleUrgencyText,
    source.maleQueryCtaLabel,
    source.maleRegisterCtaLabel,
    translateDynamic,
  ]);

  return {
    promoText,
    formIntro,
    enrollmentSuccessMessage,
    malePromoText,
    maleFormIntro,
    maleUrgencyText,
    maleQueryCtaLabel,
    maleRegisterCtaLabel,
    isTranslatingCopy: isTranslating,
  };
}
