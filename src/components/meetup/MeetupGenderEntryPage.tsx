'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CampaignPageBackground } from '@/components/campaign/campaign-premium-ui';
import { CampaignLocaleProvider } from '@/lib/campaign-i18n/CampaignLocaleContext';
import StrangersGroupRegisterModal from '@/components/campaign/StrangersGroupRegisterModal';
import MeetupCityPromptModal from '@/components/meetup/MeetupCityPromptModal';
import MeetupEntryStats from '@/components/meetup/MeetupEntryStats';
import MeetupCountryEntryStats from '@/components/meetup/MeetupCountryEntryStats';
import {
  fetchMonthlyFemaleEnrollmentCount,
  fetchStrangersGroupRegisterWhatsapp,
  fetchStrangersGroupCities,
  incrementMonthlyFemaleEnrollmentCount,
  incrementMonthlyMaleEnrollmentCount,
} from '@/lib/meetup-entry-stats';
import {
  buildDefaultStrangersGroupCities,
  DEFAULT_STRANGERS_GROUP_REGISTER_WHATSAPP,
} from '@/types/campaign-landing';
import {
  trackMeetupFunnelEvent,
  trackStrangersGroupFemaleClick,
  trackStrangersGroupMaleClick,
} from '@/lib/meetup-entry-funnel';
import type { CampaignCityOption } from '@/types/campaign-landing';
import { whatsappSendHrefIndian } from '@/lib/indian-phone';

const MALE_REDIRECT = '/';

type WhatsAppRedirect = {
  number: string;
  message: string;
};

function GenderButton({
  label,
  accent,
  onClick,
  delay,
}: {
  label: string;
  accent: 'sky' | 'brand';
  onClick: () => void;
  delay: number;
}) {
  const isBrand = accent === 'brand';

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 sm:py-[1.125rem] text-base font-semibold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80 ${
        isBrand
          ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-[0_12px_40px_-12px_rgba(249,115,22,0.55)] hover:from-primary-400 hover:to-primary-300 focus-visible:ring-primary-400'
          : 'border border-white/[0.12] bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-sky-400/40 hover:bg-sky-500/[0.08] focus-visible:ring-sky-400'
      }`}
    >
      {!isBrand && (
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_70%)]"
          aria-hidden
        />
      )}
      <span className="relative">{label}</span>
      <ArrowRight
        className={`relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 ${
          isBrand ? 'text-white/90' : 'text-gray-400 group-hover:text-white'
        }`}
        aria-hidden
      />
    </motion.button>
  );
}

type MeetupGenderEntryPageProps = {
  /** Same-site path after Female is selected (hidden campaign form). */
  femaleRedirect: string;
  /** Same-site path after Male is selected (defaults to home). */
  maleRedirect?: string;
  /** If set, Female goes here first (e.g. FAQ) instead of femaleRedirect. */
  femaleFaqPath?: string;
  /** Track funnel clicks for one-on-one entry only. */
  trackOneOnOneFunnel?: boolean;
  /** Show this month's female enrollment and city meetup stats (strangers group entry). */
  showEntryStats?: boolean;
  /** If set, opening the gender button opens WhatsApp instead of the same-site redirect. */
  femaleWhatsappRedirect?: WhatsAppRedirect;
  maleWhatsappRedirect?: WhatsAppRedirect;
  /** Show country-based "Monthly Meetups Done" cards instead of female/city stats. */
  showCountryStats?: boolean;
  /** Copy shown under the heading. Defaults to the original intro. */
  description?: string;
  /** Ask for a city first, then open WhatsApp with the city injected in the message. */
  collectCityBeforeWhatsapp?: boolean;
  /** Open the group city picker here instead of navigating to the campaign form. */
  groupCityPicker?: boolean;
};

export default function MeetupGenderEntryPage({
  femaleRedirect,
  maleRedirect = MALE_REDIRECT,
  femaleFaqPath,
  trackOneOnOneFunnel = false,
  showEntryStats = false,
  femaleWhatsappRedirect,
  maleWhatsappRedirect,
  showCountryStats = false,
  description = 'Turn strangers into lifelong friends through exciting events and meaningful connections. Every gathering is a new beginning, every stranger a potential best friend.',
  collectCityBeforeWhatsapp = false,
  groupCityPicker = false,
}: MeetupGenderEntryPageProps) {
  const router = useRouter();
  const [femaleCount, setFemaleCount] = useState(0);
  const [cityPrompt, setCityPrompt] = useState<WhatsAppRedirect | null>(null);
  const [groupRegisterGender, setGroupRegisterGender] = useState<'male' | 'female' | null>(null);
  const [registerWhatsapp, setRegisterWhatsapp] = useState(
    DEFAULT_STRANGERS_GROUP_REGISTER_WHATSAPP
  );
  // Start with the standard city list so the meetup cards never sit in the
  // "No cities added yet" state; the admin-configured list replaces it once loaded.
  const [cities, setCities] = useState<CampaignCityOption[]>(() =>
    showEntryStats ? buildDefaultStrangersGroupCities() : []
  );

  useEffect(() => {
    if (!showEntryStats) return;
    let cancelled = false;

    fetchMonthlyFemaleEnrollmentCount()
      .then((count) => {
        if (!cancelled) setFemaleCount(count);
      })
      .catch((error) => {
        console.error('Load female enrollment count:', error);
        if (!cancelled) setFemaleCount(0);
      });

    fetchStrangersGroupCities()
      .then((nextCities) => {
        if (!cancelled) setCities(nextCities);
      })
      .catch((error) => {
        console.error('Load strangers group cities:', error);
      });

    fetchStrangersGroupRegisterWhatsapp()
      .then((number) => {
        if (!cancelled) setRegisterWhatsapp(number);
      })
      .catch((error) => {
        console.error('Load strangers group register WhatsApp:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [showEntryStats]);

  const startWhatsappRedirect = (redirect: WhatsAppRedirect) => {
    if (collectCityBeforeWhatsapp) {
      setCityPrompt(redirect);
      return;
    }
    const href = whatsappSendHrefIndian(redirect.number, redirect.message);
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  const handleFemaleClick = () => {
    if (trackOneOnOneFunnel) {
      trackMeetupFunnelEvent('female_button');
    }
    if (femaleWhatsappRedirect) {
      startWhatsappRedirect(femaleWhatsappRedirect);
      return;
    }
    if (showEntryStats) {
      // Counted as a click (admin funnel), not stored as a submission.
      trackStrangersGroupFemaleClick();
      void incrementMonthlyFemaleEnrollmentCount().then((count) => {
        if (count !== null) setFemaleCount(count);
      });
    }
    if (groupCityPicker) {
      setGroupRegisterGender('female');
      return;
    }
    router.push(femaleFaqPath || femaleRedirect);
  };

  const handleMaleClick = () => {
    if (maleWhatsappRedirect) {
      startWhatsappRedirect(maleWhatsappRedirect);
      return;
    }
    if (showEntryStats) {
      trackStrangersGroupMaleClick();
      void incrementMonthlyMaleEnrollmentCount();
    }
    if (groupCityPicker) {
      setGroupRegisterGender('male');
      return;
    }
    router.push(maleRedirect);
  };

  const options = [
    { id: 'male' as const, label: 'Male', redirect: maleRedirect, accent: 'sky' as const },
    { id: 'female' as const, label: 'Female', redirect: femaleRedirect, accent: 'brand' as const },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full text-white">
      <CampaignPageBackground />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-5 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="flex justify-center pt-10 sm:pt-14"
        >
          <div className="inline-flex items-center gap-3 rounded-2xl py-1.5 pr-1">
            <div className="relative">
              <div
                className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary-500/50 to-transparent opacity-60 blur"
                aria-hidden
              />
              <Image
                src="/media/logo-new.png"
                alt=""
                width={48}
                height={48}
                className="relative rounded-xl ring-1 ring-white/15"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-tight text-white">Unigather</p>
              <p className="text-[11px] tracking-wide text-gray-500">Gather · Connect · Belong</p>
            </div>
          </div>
        </motion.header>

        <main className="flex flex-1 flex-col items-center justify-center py-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-3xl text-center"
          >
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
              <Sparkles className="h-3.5 w-3.5 text-primary-400" aria-hidden />
              Welcome
            </span>

            <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
              <span className="gradient-text block">Gathering Minds</span>
              <span className="mt-1 block text-white sm:mt-2">Uniting Hearts</span>
            </h1>

            <div
              className="mx-auto my-6 h-px w-16 bg-gradient-to-r from-transparent via-primary-500/70 to-transparent sm:my-8"
              aria-hidden
            />

            <p className="mx-auto max-w-xl text-[0.9375rem] leading-[1.7] text-gray-400 sm:text-lg sm:leading-relaxed">
              {description}
            </p>
          </motion.div>
        </main>

        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:pb-12"
        >
          <div className="mx-auto w-full max-w-md rounded-[1.625rem] border border-white/[0.08] bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_-32px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-lg sm:p-5">
            <p className="mb-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              I am
            </p>
            <div className="grid grid-cols-2 gap-3">
              {options.map((option, index) => (
                <GenderButton
                  key={option.id}
                  label={option.label}
                  accent={option.accent}
                  delay={0.18 + index * 0.07}
                  onClick={
                    option.id === 'female' ? handleFemaleClick : handleMaleClick
                  }
                />
              ))}
            </div>
          </div>

          {showCountryStats ? (
            <MeetupCountryEntryStats femaleCount={femaleCount} />
          ) : showEntryStats ? (
            <MeetupEntryStats femaleCount={femaleCount} cities={cities} />
          ) : null}
        </motion.footer>
      </div>

      {cityPrompt ? (
        <MeetupCityPromptModal
          number={cityPrompt.number}
          messageTemplate={cityPrompt.message}
          onClose={() => setCityPrompt(null)}
        />
      ) : null}

      {groupRegisterGender ? (
        <CampaignLocaleProvider>
          <StrangersGroupRegisterModal
            cities={cities}
            whatsappNumber={registerWhatsapp}
            gender={groupRegisterGender}
            initialStep="cities"
            onClose={() => setGroupRegisterGender(null)}
          />
        </CampaignLocaleProvider>
      ) : null}
    </div>
  );
}
