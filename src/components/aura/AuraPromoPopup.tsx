'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

const SESSION_KEY = 'unigather_aura_promo_dismissed';

const POSTER_SRC = '/media/the-aura-poster.jpg';

const AuraPromoPopup: React.FC = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    html.dataset.modalOpen = 'true';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      delete html.dataset.modalOpen;
      html.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
  };

  const goToAura = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
    router.push('/buy-your-aura');
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain pt-safe pb-safe px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="The Aura — limited edition fragrance"
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={dismiss}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-[min(100%,22rem)] sm:max-w-lg md:max-w-xl my-auto shrink-0"
          >
            <div className="relative rounded-lg sm:rounded-sm overflow-hidden ring-1 ring-aura-gold/40 shadow-[0_24px_80px_-12px_rgba(212,175,55,0.35)]">
              <button
                type="button"
                onClick={dismiss}
                className="absolute top-2 right-2 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-black/85 border border-white/20 text-gray-300 hover:text-white hover:border-aura-gold/50 active:bg-black transition-colors shadow-lg touch-manipulation"
                aria-label="Close and stay on home page"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={goToAura}
                className="group block w-full text-left touch-manipulation hover:ring-aura-gold/70 active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-gold focus-visible:ring-inset"
              >
                <div className="relative bg-black">
                  <img
                    src={POSTER_SRC}
                    alt="The Aura — unigather Fragrance limited edition"
                    className="w-full max-h-[min(62dvh,520px)] sm:max-h-[min(72dvh,640px)] md:max-h-[min(78dvh,720px)] object-contain object-center mx-auto"
                    sizes="(max-width: 640px) 92vw, 480px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent pt-10 sm:pt-16 pb-3 sm:pb-4 px-3 sm:px-6 pointer-events-none">
                    <p className="text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-aura-gold/90 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      Limited edition
                    </p>
                    <p className="font-aura-display text-base sm:text-xl md:text-2xl text-white leading-snug group-hover:text-aura-gold-light transition-colors">
                      Tap to explore Buy Your Aura
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-[10px] sm:text-[11px] text-gray-500 mt-2 sm:mt-3 px-2 leading-relaxed">
              
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AuraPromoPopup;
