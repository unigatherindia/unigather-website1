'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { CampaignLocaleProvider, useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';
import { useTranslatedCopy } from '@/lib/campaign-i18n/use-translated-copy';
import type { CampaignFormField } from '@/types/campaign-landing';
import CampaignLanguageSelect from '@/components/campaign/CampaignLanguageSelect';
import FreeOneOnOneEnrollmentModal from '@/components/campaign/FreeOneOnOneEnrollmentModal';
import StrangersGroupEnrollmentModal from '@/components/campaign/StrangersGroupEnrollmentModal';
import {
  CampaignContactPills,
  CampaignFormCard,
  CampaignPageBackground,
  CampaignPageHeader,
  CampaignPromoCard,
  CampaignSubmitButton,
  campaignFieldClass,
  campaignLabelClass,
} from '@/components/campaign/campaign-premium-ui';
import {
  CAMPAIGN_LOCKED_GENDER,
  CAMPAIGN_LANDING_META,
  DEFAULT_CAMPAIGN_LANDING_CONFIG,
  findCampaignCity,
  parseCampaignLandingConfig,
  type CampaignLandingConfig,
  type CampaignLandingSlug,
} from '@/types/campaign-landing';
import { formatIndianPhoneDisplay, telHrefIndian } from '@/lib/indian-phone';
import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';

type FormState = Record<CampaignFormField, string>;

function emptyForm(fields: CampaignFormField[]): FormState {
  const state = fields.reduce((acc, field) => ({ ...acc, [field]: '' }), {} as FormState);
  if (fields.includes('gender')) {
    state.gender = CAMPAIGN_LOCKED_GENDER;
  }
  return state;
}

type Props = {
  slug: CampaignLandingSlug;
};

export default function CampaignLandingPage(props: Props) {
  return (
    <CampaignLocaleProvider>
      <CampaignLandingPageInner {...props} />
    </CampaignLocaleProvider>
  );
}

function CampaignLandingPageInner({ slug }: Props) {
  const meta = CAMPAIGN_LANDING_META[slug];
  const { locale, messages, dir } = useCampaignLocale();
  const [config, setConfig] = useState<CampaignLandingConfig>(
    DEFAULT_CAMPAIGN_LANDING_CONFIG[slug]
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [form, setForm] = useState<FormState>(() => emptyForm(meta.formFields));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFreeOneOnOneSuccess, setShowFreeOneOnOneSuccess] = useState(false);
  const [strangersEnrollment, setStrangersEnrollment] = useState<{
    cityName: string;
    instaGroupLink: string;
  } | null>(null);

  const { promoText, formIntro, enrollmentSuccessMessage, isTranslatingCopy } = useTranslatedCopy({
    promoText: config.promoText,
    formIntro: config.formIntro,
    enrollmentSuccessMessage: config.enrollmentSuccessMessage,
  });

  const loadConfig = useCallback(async () => {
    if (!db) {
      setIsLoadingConfig(false);
      return;
    }
    setIsLoadingConfig(true);
    try {
      const snap = await getDoc(doc(db, meta.configCollection, meta.configDocId));
      setConfig(parseCampaignLandingConfig(slug, snap.data() as Record<string, unknown>));
    } catch (error) {
      console.error('Load campaign landing config:', error);
      setConfig(DEFAULT_CAMPAIGN_LANDING_CONFIG[slug]);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [meta.configCollection, meta.configDocId, slug]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const fieldLabel = useCallback(
    (field: CampaignFormField): string => {
      const map: Record<CampaignFormField, string> = {
        name: messages.fieldName,
        gender: messages.fieldGender,
        mobile: messages.fieldMobile,
        email: messages.fieldEmail,
        city: messages.fieldCity,
        instagram: messages.fieldInstagram,
        age: messages.fieldAge,
        contactInfo: messages.fieldContact,
        genderPreference: messages.fieldGenderPref,
        hobbies: messages.fieldHobbies,
      };
      return map[field];
    },
    [messages]
  );

  const setField = (field: CampaignFormField, value: string) => {
    if (field === 'gender') return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (!form.name.trim()) {
      toast.error(messages.fieldName);
      return false;
    }
    if (meta.formFields.includes('mobile') && !form.mobile.trim()) {
      toast.error(messages.fieldMobile);
      return false;
    }
    if (meta.formFields.includes('email')) {
      const email = form.email.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error(messages.fieldEmail);
        return false;
      }
    }
    if (meta.formFields.includes('age')) {
      const age = Number(form.age);
      if (!form.age.trim() || Number.isNaN(age) || age < 16 || age > 99) {
        toast.error(messages.fieldAge);
        return false;
      }
    }
    if (meta.formFields.includes('contactInfo') && !form.contactInfo.trim()) {
      toast.error(messages.fieldContact);
      return false;
    }
    if (meta.formFields.includes('genderPreference') && !form.genderPreference.trim()) {
      toast.error(messages.fieldGenderPref);
      return false;
    }
    if (meta.formFields.includes('city') && !form.city.trim()) {
      toast.error(messages.fieldCity);
      return false;
    }
    if (slug === 'strangers-group' && config.cities.length === 0) {
      toast.error(messages.noCities);
      return false;
    }
    return true;
  };

  const fetchAdminEnglish = async (fields: Record<string, string>) => {
    try {
      const response = await fetch('/api/campaign/admin-english', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, fields }),
      });
      const data = (await response.json()) as { adminEnglish?: Record<string, string> };
      return data.adminEnglish ?? {};
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.pageEnabled) {
      toast.error(messages.formClosed);
      return;
    }
    if (!validate()) return;
    if (!db) {
      toast.error(messages.formClosed);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCity =
        slug === 'strangers-group' ? findCampaignCity(config.cities, form.city.trim()) : undefined;

      const rawFields: Record<string, string> = {};
      meta.formFields.forEach((field) => {
        rawFields[field] = form[field].trim();
      });
      if (selectedCity) {
        rawFields.city = selectedCity.name;
      }

      const adminEnglish = await fetchAdminEnglish(rawFields);

      const payload: Record<string, unknown> = {
        campaignSlug: slug,
        preferredLanguage: locale,
        createdAt: Timestamp.now(),
        status: 'submitted',
        adminEnglish,
      };

      meta.formFields.forEach((field) => {
        const raw = form[field].trim();
        if (field === 'age') {
          payload.age = Number(raw);
        } else if (field === 'city' && selectedCity) {
          payload.city = selectedCity.name;
          payload.cityId = selectedCity.id;
        } else {
          payload[field] = raw;
        }
      });

      if (selectedCity) {
        payload.cityInstaGroupLink = selectedCity.instaGroupLink;
      }

      await addDoc(collection(db, meta.leadsCollection), payload);
      setForm(emptyForm(meta.formFields));

      if (slug === 'strangers-group') {
        setStrangersEnrollment({
          cityName: selectedCity?.name ?? '',
          instaGroupLink: selectedCity?.instaGroupLink ?? '',
        });
      } else if (slug === 'free-one-on-one') {
        setShowFreeOneOnOneSuccess(true);
      }
    } catch (error) {
      console.error('Campaign form submit:', error);
      toast.error('Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactPills = useMemo(() => {
    return [
      config.queryPhone.trim()
        ? {
            label: messages.contactQuery,
            phone: formatIndianPhoneDisplay(config.queryPhone),
            href: telHrefIndian(config.queryPhone),
          }
        : null,
      config.complaintPhone.trim()
        ? {
            label: messages.contactComplaint,
            phone: formatIndianPhoneDisplay(config.complaintPhone),
            href: telHrefIndian(config.complaintPhone),
          }
        : null,
    ].filter(Boolean) as { label: string; phone: string; href: string }[];
  }, [config.complaintPhone, config.queryPhone, messages.contactComplaint, messages.contactQuery]);

  const genderOptions = useMemo(
    () => [
      { value: 'male', label: messages.genderMen },
      { value: 'female', label: messages.genderWomen },
      { value: 'any', label: messages.genderAnyone },
    ],
    [messages.genderAnyone, messages.genderMen, messages.genderWomen]
  );

  const renderField = (field: CampaignFormField) => {
    const label = fieldLabel(field);

    if (field === 'gender') {
      return (
        <div key={field}>
          <label className={campaignLabelClass}>{label}</label>
          <input
            type="text"
            value={messages.genderFemale}
            readOnly
            disabled
            aria-readonly="true"
            className={`${campaignFieldClass} cursor-not-allowed opacity-90`}
          />
        </div>
      );
    }

    if (field === 'genderPreference') {
      return (
        <div key={field}>
          <label className={campaignLabelClass}>{label}</label>
          <select
            value={form.genderPreference}
            onChange={(e) => setField(field, e.target.value)}
            className={`${campaignFieldClass} appearance-none cursor-pointer`}
            required
          >
            <option value="">{messages.selectOption}</option>
            {genderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field === 'city' && slug === 'strangers-group') {
      if (config.cities.length === 0) {
        return (
          <div key={field}>
            <label className={campaignLabelClass}>{label}</label>
            <p className="text-sm text-amber-200/90 rounded-xl py-3 px-4 bg-amber-500/10 border border-amber-500/20">
              {messages.noCities}
            </p>
          </div>
        );
      }
      return (
        <div key={field}>
          <label className={campaignLabelClass}>{label}</label>
          <select
            value={form.city}
            onChange={(e) => setField(field, e.target.value)}
            className={`${campaignFieldClass} appearance-none cursor-pointer`}
            required
          >
            <option value="">{messages.selectCity}</option>
            {config.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field === 'hobbies') {
      return (
        <div key={field}>
          <label className={campaignLabelClass}>{label}</label>
          <textarea
            value={form.hobbies}
            onChange={(e) => setField(field, e.target.value)}
            rows={3}
            className={`${campaignFieldClass} resize-none`}
            placeholder={messages.hobbiesPlaceholder}
          />
        </div>
      );
    }

    const inputType =
      field === 'email' ? 'email' : field === 'age' ? 'number' : field === 'mobile' ? 'tel' : 'text';

    return (
      <div key={field}>
        <label className={campaignLabelClass}>{label}</label>
        <input
          type={inputType}
          value={form[field]}
          onChange={(e) => setField(field, e.target.value)}
          className={campaignFieldClass}
          required={['name', 'mobile', 'email', 'city', 'contactInfo', 'age'].includes(field)}
          min={field === 'age' ? 16 : undefined}
          max={field === 'age' ? 99 : undefined}
        />
      </div>
    );
  };

  const submitLabel =
    slug === 'strangers-group' ? messages.submitStrangers : messages.submitOneOnOne;

  return (
    <div
      className="relative min-h-screen bg-[#0c0c0f] text-white selection:bg-primary-500/30"
      dir={dir}
      lang={locale}
    >
      {showFreeOneOnOneSuccess && slug === 'free-one-on-one' && (
        <FreeOneOnOneEnrollmentModal
          message={enrollmentSuccessMessage || config.enrollmentSuccessMessage}
          queryPhone={config.queryPhone}
          complaintPhone={config.complaintPhone}
          onClose={() => setShowFreeOneOnOneSuccess(false)}
        />
      )}
      {strangersEnrollment && slug === 'strangers-group' && (
        <StrangersGroupEnrollmentModal
          cityName={strangersEnrollment.cityName}
          instaGroupLink={strangersEnrollment.instaGroupLink}
          unigatherInstagramUrl={config.unigatherInstagramUrl}
          whatsappNumber={config.enrollmentWhatsapp}
          onClose={() => setStrangersEnrollment(null)}
        />
      )}

      <CampaignPageBackground />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-xl lg:max-w-2xl">
        <div className="flex justify-end mb-2 sm:mb-4">
          <CampaignLanguageSelect />
        </div>

        <CampaignPageHeader slug={slug} />

        {isLoadingConfig || isTranslatingCopy ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
            <p className="text-sm text-gray-500 tracking-wide">{messages.loading}</p>
          </div>
        ) : !config.pageEnabled ? (
          <div className="rounded-3xl border border-white/[0.08] bg-dark-900/80 backdrop-blur-xl p-10 text-center">
            <p className="text-gray-300">{messages.formClosed}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <CampaignPromoCard>{promoText}</CampaignPromoCard>

            <CampaignContactPills items={contactPills} />

            <CampaignFormCard
              intro={formIntro}
              urgencyText={config.urgencyText}
              enrollmentHeader={messages.enrollmentHeader}
              enrollmentFallback={messages.enrollmentYourDetails}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {meta.formFields.map((field) => renderField(field))}
                <CampaignSubmitButton
                  disabled={isSubmitting}
                  isSubmitting={isSubmitting}
                  label={submitLabel}
                />
              </form>
            </CampaignFormCard>

            <p className="text-center text-[11px] text-gray-600 mt-8 tracking-wide">
              {messages.footerPrivacy}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
