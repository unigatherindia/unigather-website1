'use client';

import { useEffect, useState } from 'react';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';

export function useTranslatedCopy(source: {
  promoText: string;
  formIntro: string;
  enrollmentSuccessMessage: string;
}) {
  const { locale, translateDynamic } = useCampaignLocale();
  const [promoText, setPromoText] = useState(source.promoText);
  const [formIntro, setFormIntro] = useState(source.formIntro);
  const [enrollmentSuccessMessage, setEnrollmentSuccessMessage] = useState(
    source.enrollmentSuccessMessage
  );
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (locale === 'en') {
        setPromoText(source.promoText);
        setFormIntro(source.formIntro);
        setEnrollmentSuccessMessage(source.enrollmentSuccessMessage);
        return;
      }

      setIsTranslating(true);
      try {
        const [promo, intro, success] = await Promise.all([
          translateDynamic(source.promoText),
          source.formIntro.trim() ? translateDynamic(source.formIntro) : Promise.resolve(''),
          source.enrollmentSuccessMessage.trim()
            ? translateDynamic(source.enrollmentSuccessMessage)
            : Promise.resolve(''),
        ]);
        if (!cancelled) {
          setPromoText(promo);
          setFormIntro(intro);
          setEnrollmentSuccessMessage(success);
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
    translateDynamic,
  ]);

  return { promoText, formIntro, enrollmentSuccessMessage, isTranslatingCopy: isTranslating };
}
