'use client';

import React from 'react';
import { Droplets, Gift, Package, Sparkles, Truck } from 'lucide-react';
import {
  resolveFreeGiftPromoHighlights,
  resolveFreeGiftPromoImageUrl,
  resolveFreeGiftPromoSubtitle,
  resolveFreeGiftPromoTitle,
} from '@/constants/event-gift-promo';

interface Props {
  freeGiftImageUrl?: string | null;
  freeGiftPromoTitle?: string | null;
  freeGiftPromoSubtitle?: string | null;
  freeGiftPromoHighlights?: string[] | null;
  /** Smaller layout on collapsed event cards */
  compact?: boolean;
}

const EventFreeGiftPromo: React.FC<Props> = ({
  freeGiftImageUrl,
  freeGiftPromoTitle,
  freeGiftPromoSubtitle,
  freeGiftPromoHighlights,
  compact = false,
}) => {
  const imageSrc = resolveFreeGiftPromoImageUrl(freeGiftImageUrl);
  const title = resolveFreeGiftPromoTitle(freeGiftPromoTitle);
  const subtitle = resolveFreeGiftPromoSubtitle(freeGiftPromoSubtitle);
  const highlights = resolveFreeGiftPromoHighlights(freeGiftPromoHighlights);

  return (
    <div
      className={`relative overflow-hidden border border-primary-500/35 bg-gradient-to-br from-[#2c2418] via-dark-800 to-dark-900 ${
        compact
          ? 'mb-3 rounded-xl shadow-md sm:mb-4 sm:rounded-2xl'
          : 'mb-4 rounded-xl shadow-lg shadow-black/20 sm:rounded-2xl'
      }`}
    >
      <div
        className={`absolute rounded-full bg-primary-500/15 blur-2xl ${
          compact ? '-left-6 -top-8 h-16 w-16 sm:-left-8 sm:-top-10 sm:h-24 sm:w-24' : '-left-8 -top-10 h-20 w-20 sm:h-24 sm:w-24'
        }`}
        aria-hidden
      />
      <div className="relative flex flex-row items-stretch">
        <div
          className={`min-w-0 flex-1 ${
            compact ? 'p-2.5 sm:p-3.5' : 'p-3 sm:p-4 md:p-5'
          }`}
        >
          <div
            className={`flex items-center gap-0.5 font-bold uppercase text-primary-300 sm:gap-1.5 sm:tracking-[0.14em] ${
              compact
                ? 'text-[7px] tracking-[0.08em] sm:text-[9px]'
                : 'text-[7px] tracking-[0.08em] sm:text-[10px]'
            }`}
          >
            <Sparkles
              className={`shrink-0 text-primary-400 ${compact ? 'h-2 w-2 sm:h-3 sm:w-3' : 'h-2 w-2 sm:h-3 sm:w-3'}`}
            />
            Complimentary
          </div>
          <h3
            className={`text-white ${
              compact
                ? 'mt-0.5 line-clamp-3 text-[9px] font-semibold leading-[1.25] sm:mt-1.5 sm:line-clamp-none sm:text-sm sm:font-bold sm:leading-snug md:text-base'
                : 'mt-0.5 text-[10px] font-semibold leading-[1.25] sm:mt-1.5 sm:text-base sm:font-bold md:text-lg lg:text-xl'
            }`}
          >
            {title}
          </h3>
          <p
            className={`text-gray-400 sm:text-gray-300 ${
              compact
                ? 'mt-0.5 line-clamp-2 text-[8px] leading-snug sm:mt-1 sm:line-clamp-none sm:text-[11px] sm:text-gray-300'
                : 'mt-0.5 text-[8px] leading-snug sm:mt-1 sm:text-xs md:text-sm'
            }`}
          >
            {subtitle}
          </p>
          {!compact && highlights.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-gray-400 sm:mt-3 sm:gap-x-3 sm:gap-y-1.5 sm:text-[11px]">
              {highlights.map((line, index) => {
                const Icon = index === 0 ? Droplets : index === 1 ? Package : Truck;
                return (
                  <li key={`${line}-${index}`} className="flex items-center gap-1">
                    <Icon className="h-3 w-3 text-primary-400" />
                    {line}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className={`relative shrink-0 bg-gradient-to-l from-black/40 to-transparent ${
            compact
              ? 'w-[32%] max-w-[6.75rem] min-h-[4.75rem] sm:w-[38%] sm:max-w-[9.5rem] sm:min-h-[7.5rem]'
              : 'w-[34%] max-w-[7.5rem] min-h-[5.5rem] sm:w-[42%] sm:max-w-[12.5rem] sm:min-h-[8.5rem] md:min-h-[9.5rem]'
          }`}
        >
          <img
            src={imageSrc}
            alt="Complimentary Unigather fragrance gift"
            className={`absolute inset-0 h-full w-full object-contain object-right-bottom ${
              compact ? 'p-1 sm:p-1.5' : 'p-1 sm:p-2'
            }`}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === '1') return;
              img.dataset.fallbackApplied = '1';
              img.src = '/media/the-aura-poster.jpg';
            }}
          />
          <span
            className={`absolute flex items-center justify-center rounded-full border border-primary-400/80 bg-gradient-to-br from-primary-500 to-amber-400 font-black text-white shadow-md sm:border-2 sm:shadow-lg ${
              compact
                ? 'right-0.5 top-0.5 h-6 w-6 text-[6px] sm:right-1 sm:top-1 sm:h-9 sm:w-9 sm:text-[8px]'
                : 'right-1 top-1 h-7 w-7 text-[7px] sm:right-1.5 sm:top-1.5 sm:h-10 sm:w-10 sm:text-[9px] md:h-11 md:w-11 md:text-[10px]'
            }`}
          >
            FREE
          </span>
          {!compact && (
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300 sm:bottom-2 sm:right-2 sm:h-7 sm:w-7 md:hidden">
              <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventFreeGiftPromo;
