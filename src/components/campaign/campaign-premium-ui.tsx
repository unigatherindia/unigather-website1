'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';
import type { CampaignLandingSlug } from '@/types/campaign-landing';

export const campaignFieldClass =
  'w-full px-4 py-3.5 rounded-xl bg-black/35 border border-white/[0.08] text-white placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 focus:outline-none focus:border-primary-400/45 focus:ring-2 focus:ring-primary-500/25 focus:bg-black/45';

export const campaignLabelClass =
  'block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2';

export function CampaignPageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.18),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(168,85,247,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.85))]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute top-[12%] left-[8%] w-64 h-64 bg-primary-500/15 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[8%] right-[5%] w-80 h-80 bg-violet-500/10 rounded-full blur-[120px]" />
    </div>
  );
}

export function CampaignPageHeader({ slug }: { slug: CampaignLandingSlug }) {
  const { messages } = useCampaignLocale();
  const badge =
    slug === 'strangers-group' ? messages.badgeStrangers : messages.badgeOneOnOne;
  const title =
    slug === 'strangers-group' ? messages.titleStrangers : messages.titleOneOnOne;

  return (
    <header className="mb-10 sm:mb-12">
      <div
        className="inline-flex items-center gap-3 mb-8 rounded-2xl pr-4 py-1.5 cursor-default select-none"
        aria-label="Unigather"
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary-500/40 to-transparent rounded-xl blur opacity-60" />
          <Image
            src="/media/logo-new.png"
            alt=""
            width={44}
            height={44}
            className="relative rounded-xl ring-1 ring-white/10"
            aria-hidden
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-tight">Unigather</p>
          <p className="text-[11px] text-gray-500 tracking-wide">{messages.brandTagline}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/[0.04] border border-white/[0.08] text-gray-300 mb-4`}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          {badge}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
          <span className="gradient-text">{title}</span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-lg leading-relaxed">
          {messages.headerSubtitle}
        </p>
      </motion.div>
    </header>
  );
}

export function CampaignPromoCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.05 }}
      className="relative mb-8 rounded-3xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]"
    >
      <div className="relative rounded-[calc(1.5rem-1px)] bg-dark-900/75 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400/80 via-primary-500/30 to-transparent" />
        <div className="p-6 sm:p-9 pl-7 sm:pl-10 whitespace-pre-wrap text-gray-100/95 leading-[1.75] text-[15px] sm:text-[16px] font-light">
          {children}
        </div>
      </div>
    </motion.article>
  );
}

export function CampaignFormCard({
  intro,
  urgencyText,
  enrollmentHeader,
  enrollmentFallback,
  children,
}: {
  intro?: string;
  urgencyText?: string;
  enrollmentHeader: string;
  enrollmentFallback: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12 }}
      className="relative rounded-3xl p-[1px] bg-gradient-to-br from-primary-500/35 via-white/10 to-violet-500/20 shadow-[0_32px_64px_-32px_rgba(249,115,22,0.35)]"
    >
      <div className="rounded-[calc(1.5rem-1px)] bg-dark-900/90 backdrop-blur-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 sm:px-9 pt-7 pb-2 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-400/90 mb-1">
            {enrollmentHeader}
          </p>
          {intro?.trim() ? (
            <p className="text-gray-200 font-medium text-base sm:text-lg">{intro}</p>
          ) : (
            <p className="text-gray-200 font-medium text-base sm:text-lg">{enrollmentFallback}</p>
          )}
          {urgencyText?.trim() ? (
            <p className="text-amber-300/95 font-semibold text-sm mt-3 text-center py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              {urgencyText}
            </p>
          ) : null}
        </div>
        <div className="p-6 sm:p-9 pt-6">{children}</div>
      </div>
    </motion.div>
  );
}

export function CampaignSubmitButton({
  disabled,
  isSubmitting,
  label,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full mt-3 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-white tracking-wide bg-gradient-to-r from-primary-500 via-orange-500 to-primary-600 hover:from-primary-400 hover:via-orange-400 hover:to-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-black/25"
    >
      {isSubmitting ? (
        <>
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Submitting…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function CampaignContactPills({
  items,
}: {
  items: { label: string; phone: string; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.08 }}
      className="mb-8 flex flex-col gap-2"
    >
      {items.map(({ label, phone, href }) => (
        <a
          key={label}
          href={href}
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-primary-500/30 hover:bg-white/[0.05] transition-all text-sm"
        >
          <span className="text-gray-400">{label}</span>
          <span className="font-semibold text-primary-300">{phone}</span>
        </a>
      ))}
    </motion.div>
  );
}

type ModalFrameProps = {
  titleId: string;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
};

export function CampaignEnrollmentModalFrame({
  titleId,
  onClose,
  icon,
  title,
  subtitle,
  children,
  footer,
  closeLabel = 'Close',
}: ModalFrameProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-md p-[1px] rounded-3xl bg-gradient-to-br from-primary-400/50 via-white/20 to-violet-500/30 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="relative rounded-[calc(1.5rem-1px)] bg-dark-900/95 backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8">
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mb-6 pt-2">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-green-400/25 rounded-full blur-xl scale-150" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-400/30">
                {icon}
              </div>
            </div>
            <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              {title}
            </h2>
            {subtitle ? <div className="text-gray-400 text-sm sm:text-base leading-relaxed">{subtitle}</div> : null}
          </div>

          <div className="space-y-3">{children}</div>

          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-6 py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.04] transition-all"
            >
              {closeLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function CampaignModalActionPrimary({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-orange-600 hover:from-primary-400 hover:to-orange-500 shadow-lg shadow-primary-900/30 transition-all ${className}`}
    >
      {children}
    </a>
  );
}

export function CampaignModalActionSecondary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-medium text-gray-100 bg-white/[0.04] border border-white/[0.1] hover:border-primary-400/40 hover:bg-white/[0.07] transition-all"
    >
      {children}
    </a>
  );
}
