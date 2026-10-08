'use client';

import React from 'react';
import { Droplets, Gift, Package, Sparkles, Truck } from 'lucide-react';
import { resolveFreeGiftPromoImageUrl } from '@/constants/event-gift-promo';

interface Props {
  freeGiftImageUrl?: string | null;
  /** Smaller layout on collapsed event cards */
  compact?: boolean;
}

const EventFreeGiftPromo: React.FC<Props> = ({ freeGiftImageUrl, compact = false }) => {
  const imageSrc = resolveFreeGiftPromoImageUrl(freeGiftImageUrl);

  return (
    <div
      className={`relative mb-4 overflow-hidden rounded-2xl border border-primary-500/35 bg-gradient-to-br from-[#2c2418] via-dark-800 to-dark-900 ${
        compact ? 'shadow-md' : 'shadow-lg shadow-black/20'
      }`}
    >
      <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-primary-500/15 blur-2xl" aria-hidden />
      <div className="relative flex flex-row items-stretch">
        <div className={`min-w-0 flex-1 ${compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'}`}>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary-300 sm:text-[10px]">
            <Sparkles className="h-3 w-3 shrink-0 text-primary-400" />
            Complimentary
          </div>
          <h3
            className={`mt-1.5 font-bold leading-snug text-white ${
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl'
            }`}
          >
            FREE Unigather Premium Fragrance
          </h3>
          <p className={`mt-1 text-gray-300 ${compact ? 'text-[11px] leading-snug' : 'text-xs sm:text-sm'}`}>
            7ml Fragrance Oil with every booking
          </p>
          {!compact && (
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-gray-400 sm:text-[11px]">
              <li className="flex items-center gap-1">
                <Droplets className="h-3 w-3 text-primary-400" />
                Premium Fragrance Oil
              </li>
              <li className="flex items-center gap-1">
                <Package className="h-3 w-3 text-primary-400" />
                7ml Bottle
              </li>
              <li className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-primary-400" />
                Delivered to your doorstep
              </li>
            </ul>
          )}
        </div>

        <div
          className={`relative shrink-0 bg-gradient-to-l from-black/40 to-transparent ${
            compact ? 'w-[38%] max-w-[9.5rem] min-h-[7.5rem]' : 'w-[42%] max-w-[11rem] sm:max-w-[12.5rem] min-h-[8.5rem] sm:min-h-[9.5rem]'
          }`}
        >
          <img
            src={imageSrc}
            alt="Complimentary Unigather fragrance gift"
            className="absolute inset-0 h-full w-full object-contain object-right-bottom p-1.5 sm:p-2"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === '1') return;
              img.dataset.fallbackApplied = '1';
              img.src = '/media/the-aura-poster.jpg';
            }}
          />
          <span
            className={`absolute flex items-center justify-center rounded-full border-2 border-primary-400/80 bg-gradient-to-br from-primary-500 to-amber-400 font-black text-white shadow-lg ${
              compact
                ? 'right-1 top-1 h-9 w-9 text-[8px]'
                : 'right-1.5 top-1.5 h-10 w-10 text-[9px] sm:h-11 sm:w-11 sm:text-[10px]'
            }`}
          >
            FREE
          </span>
          <span className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300 sm:hidden">
            <Gift className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default EventFreeGiftPromo;
