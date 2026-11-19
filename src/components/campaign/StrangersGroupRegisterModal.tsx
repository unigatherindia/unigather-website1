'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, UserPlus } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import toast from 'react-hot-toast';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';
import {
  CampaignEnrollmentModalFrame,
  campaignFieldClass,
} from '@/components/campaign/campaign-premium-ui';
import { incrementMonthlyCityJoinCount } from '@/lib/meetup-entry-stats';
import { whatsappHrefIndian } from '@/lib/indian-phone';
import {
  addCityToStrangersGroupRegisterLead,
  saveStrangersGroupLead,
} from '@/lib/strangers-group-leads';
import {
  DEFAULT_STRANGERS_GROUP_REGISTER_WHATSAPP,
  type CampaignCityOption,
} from '@/types/campaign-landing';

type Props = {
  cities: CampaignCityOption[];
  /** Number opened by female city buttons — controlled from the admin panel. */
  whatsappNumber: string;
  /** Number opened by male city buttons (falls back to whatsappNumber). */
  maleWhatsappNumber?: string;
  gender?: 'male' | 'female';
  onClose: () => void;
};

type Step = 'name' | 'cities';

export default function StrangersGroupRegisterModal({
  cities,
  whatsappNumber,
  maleWhatsappNumber = '',
  gender = 'female',
  onClose,
}: Props) {
  const isMale = gender === 'male';
  const { messages, locale } = useCampaignLocale();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  /** Registration lead created on Proceed — the city is added to it later. */
  const registerLeadPromiseRef = useRef<Promise<string | null> | null>(null);
  const registerWhatsapp = isMale
    ? maleWhatsappNumber.trim() ||
      whatsappNumber.trim() ||
      DEFAULT_STRANGERS_GROUP_REGISTER_WHATSAPP
    : whatsappNumber.trim() || DEFAULT_STRANGERS_GROUP_REGISTER_WHATSAPP;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleProceed = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(messages.registerNameRequired);
      return;
    }
    setName(trimmed);
    registerLeadPromiseRef.current = saveStrangersGroupLead({
      kind: 'register_name',
      name: trimmed,
      ...(isMale ? { gender: 'male' } : {}),
      preferredLanguage: locale,
    });
    setStep('cities');
  };

  const buildCityWhatsappHref = (city: CampaignCityOption) => {
    const base = whatsappHrefIndian(registerWhatsapp);
    if (!base) return '';
    const message = `Hi Unigather! I'm ${name} from ${city.name}. I've registered for the Group Strangers Meetup. Please share the group link.`;
    return `${base}?text=${encodeURIComponent(message)}`;
  };

  const buildCityHref = (city: CampaignCityOption) => {
    if (isMale) {
      return `https://www.unigather.co.in/events?city=${encodeURIComponent(city.name)}&book=1`;
    }
    return buildCityWhatsappHref(city);
  };

  const handleCityJoin = (city: CampaignCityOption) => {
    void incrementMonthlyCityJoinCount(city.id);

    const registerLeadPromise = registerLeadPromiseRef.current;
    void (async () => {
      const leadId = registerLeadPromise ? await registerLeadPromise : null;
      if (leadId) {
        await addCityToStrangersGroupRegisterLead(leadId, {
          cityId: city.id,
          cityName: city.name,
          cityWhatsappNumber: registerWhatsapp,
        });
        return;
      }

      // Fallback when the register lead could not be created (e.g. offline).
      await saveStrangersGroupLead({
        kind: 'city_join',
        name: name || undefined,
        cityId: city.id,
        cityName: city.name,
        cityWhatsappNumber: registerWhatsapp,
        ...(isMale ? { gender: 'male' } : {}),
        preferredLanguage: locale,
      });
    })();
  };

  const subtitle =
    step === 'cities'
      ? isMale
        ? messages.maleRegisterCitiesSubtitle
        : name
          ? messages.registerCitiesSubtitleWithName.replace('{name}', name)
          : messages.registerCitiesSubtitle
      : isMale
        ? ''
        : messages.registerNameSubtitle;

  return (
    <CampaignEnrollmentModalFrame
      titleId="strangers-register-title"
      onClose={onClose}
      icon={
        step === 'cities' ? (
          <WhatsAppIcon className="w-8 h-8 text-green-400" />
        ) : (
          <UserPlus className="w-8 h-8 text-green-400" strokeWidth={2} />
        )
      }
      title={
        step === 'cities'
          ? messages.registerCitiesTitle
          : isMale
            ? messages.maleRegisterNameTitle
            : messages.registerNameTitle
      }
      subtitle={subtitle}
      footer={
        <div className="mt-6 flex gap-2">
          {step === 'cities' ? (
            <button
              type="button"
              onClick={() => setStep('name')}
              className="flex flex-1 items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.04] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {messages.registerBack}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.04] transition-all"
          >
            {messages.modalClose}
          </button>
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'name' ? (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleProceed} className="space-y-4">
              <div>
                <label
                  htmlFor="strangers-register-name"
                  className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2"
                >
                  {messages.fieldName}
                </label>
                <input
                  id="strangers-register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={messages.registerNamePlaceholder}
                  className={campaignFieldClass}
                  autoFocus
                  autoComplete="name"
                  maxLength={60}
                />
              </div>
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-white tracking-wide bg-gradient-to-r from-primary-500 via-orange-500 to-primary-600 hover:from-primary-400 hover:via-orange-400 hover:to-primary-500 transition-colors shadow-md shadow-black/25"
              >
                <span>{messages.registerProceed}</span>
                <ArrowRight className="w-5 h-5 shrink-0 opacity-90 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="cities"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            {cities.length === 0 ? (
              <p className="text-amber-100/90 text-sm text-center bg-amber-500/10 border border-amber-400/25 rounded-xl py-3.5 px-4">
                {messages.registerNoCities}
              </p>
            ) : (
              <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[52vh]">
                {cities.map((city) => {
                  const href = buildCityHref(city);
                  return (
                    <a
                      key={city.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCityJoin(city)}
                      className="group flex w-full items-center gap-2.5 py-3.5 px-4 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-primary-400/40 hover:bg-white/[0.07] transition-all"
                    >
                      {isMale ? (
                        <MapPin className="w-5 h-5 shrink-0 text-primary-400" aria-hidden />
                      ) : (
                        <WhatsAppIcon className="w-5 h-5 shrink-0 text-green-400" />
                      )}
                      <span className="truncate font-medium text-gray-100">{city.name}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </CampaignEnrollmentModalFrame>
  );
}
