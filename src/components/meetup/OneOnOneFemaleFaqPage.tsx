'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown, MessageCircle, Sparkles } from 'lucide-react';
import { CampaignPageBackground } from '@/components/campaign/campaign-premium-ui';
import {
  ONE_ON_ONE_MEETUP_FAQ_ITEMS,
  ONE_ON_ONE_MEETUP_FORM_PATH,
} from '@/constants/one-on-one-meetup-faq';
import { trackMeetupFunnelEvent } from '@/lib/meetup-entry-funnel';

function FaqAccordionItem({
  question,
  answer,
  highlighted,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  highlighted?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-colors ${
        highlighted
          ? 'border-primary-500/35 bg-primary-500/[0.06]'
          : 'border-white/[0.08] bg-black/25'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-[0.9375rem] font-semibold text-white leading-snug">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-400' : ''
          }`}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function OneOnOneFemaleFaqPage() {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(ONE_ON_ONE_MEETUP_FAQ_ITEMS[3]?.id ?? null);

  const goToForm = useCallback(() => {
    trackMeetupFunnelEvent('fill_form');
    router.push(ONE_ON_ONE_MEETUP_FORM_PATH);
  }, [router]);

  return (
    <div className="relative min-h-[100dvh] w-full text-white">
      <CampaignPageBackground />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/[0.08] bg-[#0a0a0c]/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={goToForm}
              className="w-full sm:w-auto shrink-0 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(249,115,22,0.55)] transition hover:from-primary-400 hover:to-primary-300"
            >
              Fill the form
            </motion.button>
            <Link
              href="/chat-with-us"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-primary-400/40 hover:bg-white/[0.06]"
            >
              <MessageCircle className="h-4 w-4 text-primary-400" aria-hidden />
              Chat with us
            </Link>
          </div>
        </div>

        <header className="mb-6 flex items-center gap-3">
          <Image
            src="/media/logo-new.png"
            alt=""
            width={44}
            height={44}
            className="rounded-xl ring-1 ring-white/10"
          />
          <div>
            <p className="text-sm font-semibold text-white">Unigather</p>
            <p className="text-[11px] text-gray-500">One-on-One Meetup</p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
            <Sparkles className="h-3.5 w-3.5 text-primary-400" aria-hidden />
            FAQ
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Frequently asked questions
          </h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
            Everything you need to know before you register. Your comfort and safety come first.
          </p>
        </motion.div>

        <div className="flex flex-1 flex-col gap-3">
          {ONE_ON_ONE_MEETUP_FAQ_ITEMS.map((item) => (
            <FaqAccordionItem
              key={item.id}
              question={item.question}
              answer={item.answer}
              highlighted={item.highlighted}
              isOpen={openId === item.id}
              onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
            />
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/40 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="mb-4 inline-block rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Free participation
          </span>
          <h2 className="text-xl font-bold text-white mb-2">Still thinking about it?</h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
            Meet someone new, have a genuine conversation and experience something different.
            Limited slots available in your city.
          </p>
          <button
            type="button"
            onClick={goToForm}
            className="mt-6 text-lg font-bold text-white underline underline-offset-4 decoration-primary-500/80 hover:text-primary-300 transition-colors"
          >
            Register for Free
          </button>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Unigather – One-on-One Meetup
          </p>
        </section>
      </div>
    </div>
  );
}