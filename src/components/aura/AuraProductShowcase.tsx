'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Martini,
  Heart,
  Plane,
  Users,
  Star,
  Check,
  Clock,
} from 'lucide-react';
import { formatEventPrice } from '@/lib/formatPrice';
import { DEFAULT_CURRENCY } from '@/constants/countries';
import type { AuraProduct } from '@/types/aura-product';
import { AURA_OCCASION_LABELS } from '@/types/aura-product';

const occasionIcons = [Briefcase, Martini, Heart, Plane, Users];

interface Props {
  product: AuraProduct;
  index: number;
  onBuy: (product: AuraProduct) => void;
  soldOut: boolean;
}

const AuraProductShowcase: React.FC<Props> = ({ product, index, onBuy, soldOut }) => {
  const buyPlaqueRef = useRef<HTMLDivElement>(null);
  const [showMobileBuyBar, setShowMobileBuyBar] = useState(false);
  useEffect(() => {
    const el = buyPlaqueRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setShowMobileBuyBar(!entry.isIntersecting && !soldOut);
      },
      { threshold: 0, rootMargin: '0px 0px -72px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [soldOut]);

  const currency = product.currency || DEFAULT_CURRENCY;
  const highlights = product.highlights?.length ? product.highlights : [];
  const features = product.features?.length ? product.features : [];
  const stockLeft =
    product.maxStock != null
      ? Math.max(0, product.maxStock - (product.unitsSold || 0))
      : null;

  const priceBlock = (
    <div className="flex flex-wrap items-end gap-2 sm:gap-3">
      <span className="text-2xl sm:text-3xl md:text-4xl font-aura-display gradient-text-aura">
        {formatEventPrice(product.price, currency)}
      </span>
      {product.compareAtPrice != null && product.compareAtPrice !== '' && (
        <span className="text-sm sm:text-lg text-gray-500 line-through pb-0.5">
          {formatEventPrice(product.compareAtPrice, currency)}
        </span>
      )}
    </div>
  );

  return (
    <>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        className="relative pb-12 sm:pb-16 overflow-x-hidden"
      >
        {/* Cinematic hero */}
        <div className="relative -mx-4 sm:-mx-6 lg:mx-0 lg:rounded-sm overflow-hidden ring-1 ring-aura-gold/20">
          <div className="relative min-h-[min(68dvh,560px)] sm:min-h-[min(72dvh,620px)] lg:min-h-[520px]">
            <img
              src={product.image}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover object-[center_35%] sm:object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent lg:from-black/85 lg:via-black/40" />

            {product.featured && (
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-sm border border-aura-gold/40 text-aura-gold-light text-[9px] sm:text-[10px] tracking-[0.15em] uppercase">
                <Star className="w-3 h-3 fill-aura-gold text-aura-gold" />
                Featured
              </div>
            )}

            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-12">
              <div className="max-w-3xl">
                {product.brandLine && (
                  <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-gray-400 mb-2">
                    {product.brandLine}
                  </p>
                )}
                {product.edition && (
                  <p className="text-aura-gold text-[10px] sm:text-xs tracking-[0.25em] uppercase mb-2 sm:mb-3">
                    {product.edition}
                  </p>
                )}
                <h1 className="font-aura-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-2">
                  <span className="gradient-text-aura">{product.title}</span>
                </h1>
                {product.subtitle && (
                  <p className="text-aura-gold-light/95 text-sm sm:text-base md:text-lg font-light mb-4 max-w-xl">
                    {product.subtitle}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6 mt-2">
                  {priceBlock}
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => onBuy(product)}
                    className={`w-full sm:w-auto sm:min-w-[200px] min-h-[48px] py-3.5 px-8 text-sm tracking-wide uppercase font-semibold touch-manipulation ${
                      soldOut
                        ? 'bg-gray-900/90 text-gray-600 cursor-not-allowed border border-gray-800 rounded-sm'
                        : 'aura-brush-btn rounded-sm shadow-[0_12px_40px_-8px_rgba(212,175,55,0.45)]'
                    }`}
                  >
                    {soldOut ? 'Sold out' : 'Buy now'}
                  </button>
                </div>

                <p className="text-[10px] sm:text-[11px] text-gray-500 mt-3 flex flex-wrap gap-x-2 gap-y-1">
                  {product.volume && <span>{product.volume}</span>}
                  {product.sku && <span>· Ref. {product.sku}</span>}
                  {stockLeft !== null && (
                    <span className={stockLeft < 20 ? 'text-aura-gold-light' : ''}>
                      · {stockLeft} remaining
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {product.promoBanner && (
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 px-4 py-3 border border-aura-gold/25 bg-aura-gold/[0.06] text-center">
            <Clock className="w-4 h-4 shrink-0 text-aura-gold" />
            <span className="text-xs sm:text-sm text-aura-gold-light/95 tracking-wide">{product.promoBanner}</span>
          </div>
        )}

        {/* Editorial intro */}
        <div className="max-w-2xl mx-auto text-center mt-10 sm:mt-14 px-1 space-y-5 sm:space-y-6">
          {product.tagline && (
            <p className="font-aura-display text-xl sm:text-2xl md:text-3xl text-gray-300 italic leading-snug">
              &ldquo;{product.tagline.replace(/^["']|["']$/g, '')}&rdquo;
            </p>
          )}
          <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed">{product.description}</p>
        </div>

        {highlights.length > 0 && (
          <ul className="mt-8 sm:mt-10 flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 sm:pb-0 sm:flex-wrap sm:justify-center max-w-4xl mx-auto px-0.5">
            {highlights.map((h) => (
              <li
                key={h}
                className="shrink-0 sm:shrink px-4 py-2.5 text-[11px] sm:text-xs tracking-wide text-gray-300 border border-aura-gold/25 bg-white/[0.03] rounded-full"
              >
                {h}
              </li>
            ))}
          </ul>
        )}

        {/* Bento grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {product.longDescription && (
            <div className="md:col-span-2 lg:col-span-7 p-5 sm:p-7 border border-white/8 bg-white/[0.02] lg:row-span-2 min-h-[180px]">
              <h2 className="text-[10px] tracking-[0.28em] uppercase text-aura-gold mb-4">The composition</h2>
              <p className="text-gray-400 leading-relaxed whitespace-pre-line text-sm sm:text-base md:text-[17px]">
                {product.longDescription}
              </p>
            </div>
          )}

          {features.length > 0 && (
            <div
              className={`p-5 sm:p-6 border border-white/8 bg-gradient-to-br from-aura-gold/[0.06] to-transparent ${
                product.longDescription ? 'lg:col-span-5' : 'md:col-span-2 lg:col-span-6'
              }`}
            >
              <h2 className="text-[10px] tracking-[0.28em] uppercase text-aura-gold mb-4">Crafted with</h2>
              <ul className="space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-aura-gold mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className={`p-5 sm:p-6 border border-white/8 bg-white/[0.02] ${
              product.longDescription ? 'lg:col-span-5' : 'md:col-span-2 lg:col-span-6'
            }`}
          >
            <h2 className="text-[10px] tracking-[0.28em] uppercase text-aura-gold mb-4 sm:mb-5">
              Wear it when
            </h2>
            <div className="flex justify-between sm:justify-start sm:gap-6 lg:gap-4">
              {(product.occasions || AURA_OCCASION_LABELS).slice(0, 5).map((label, i) => {
                const Icon = occasionIcons[i] || Star;
                const isLast = i === 4;
                return (
                  <div
                    key={label}
                    className={`flex flex-col items-center gap-2 flex-1 sm:flex-none min-w-0 ${
                      !isLast ? 'border-r border-white/10 sm:border-r-0 pr-1 sm:pr-0' : ''
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-aura-gold/30 flex items-center justify-center bg-black/40">
                      <Icon className="w-4 h-4 text-aura-gold" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] tracking-wider text-gray-500 uppercase text-center leading-tight">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {(product.ingredients || product.howToUse) && (
            <div className="md:col-span-2 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {product.ingredients && (
                <div className="p-5 sm:p-6 border border-dashed border-aura-gold/20 bg-black/40">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-gray-500 mb-2">Ingredients</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{product.ingredients}</p>
                </div>
              )}
              {product.howToUse && (
                <div className="p-5 sm:p-6 border border-dashed border-aura-gold/20 bg-black/40">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-gray-500 mb-2">How to apply</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{product.howToUse}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom purchase plaque */}
        <div
          id="order"
          ref={buyPlaqueRef}
          className="mt-12 sm:mt-16 max-w-3xl mx-auto scroll-mt-28"
        >
          <div className="aura-gold-line mb-6 opacity-70" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 sm:gap-8 p-5 sm:p-8 border border-aura-gold/20 bg-gradient-to-r from-aura-gold/[0.08] via-transparent to-transparent">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gray-500 mb-2">Secure your bottle</p>
              {priceBlock}
              {product.promoBanner && (
                <p className="text-xs text-aura-gold-light/80 mt-2 hidden sm:block">{product.promoBanner}</p>
              )}
            </div>
            <button
              type="button"
              disabled={soldOut}
              onClick={() => onBuy(product)}
              className={`w-full sm:w-auto sm:min-w-[220px] min-h-[48px] py-3.5 px-8 text-sm tracking-wide uppercase font-semibold touch-manipulation shrink-0 ${
                soldOut
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800 rounded-sm'
                  : 'aura-brush-btn rounded-sm'
              }`}
            >
              {soldOut ? 'Sold out' : 'Buy now'}
            </button>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {showMobileBuyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-aura-gold/20 bg-black/95 backdrop-blur-md px-4 pt-3 pb-safe"
          >
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{product.title}</p>
                <p className="text-aura-gold-light text-sm font-aura-display">
                  {formatEventPrice(product.price, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onBuy(product)}
                className="shrink-0 min-h-[44px] px-5 py-2.5 text-xs aura-brush-btn rounded-sm touch-manipulation"
              >
                Buy now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuraProductShowcase;
