'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { AuraProduct } from '@/types/aura-product';
import { getAuraProductSoldOut } from '@/lib/aura-products-client';

interface Props {
  product: AuraProduct;
  index: number;
}

const AuraProductCard: React.FC<Props> = ({ product, index }) => {
  const href = `/buy-your-aura/${product.id}`;
  const buyHref = `${href}?checkout=1`;
  const soldOut = getAuraProductSoldOut(product);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="flex flex-col"
    >
      <Link href={href} className="group block touch-manipulation flex-1">
        <div className="relative aspect-[3/4] overflow-hidden bg-black ring-1 ring-aura-gold/20 group-hover:ring-aura-gold/45 transition-all duration-300 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]">
          <img
            src={product.image}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
          {product.featured && (
            <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-widest uppercase bg-black/70 border border-aura-gold/35 text-aura-gold-light">
              <Star className="w-3 h-3 fill-aura-gold text-aura-gold" />
              Featured
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h2 className="font-aura-display text-2xl sm:text-3xl text-white group-hover:text-aura-gold-light transition-colors">
              {product.title?.trim() || 'Untitled'}
            </h2>
          </div>
        </div>
      </Link>
      {soldOut ? (
        <span className="mt-4 w-full min-h-[48px] flex items-center justify-center py-3 text-sm rounded-sm border border-gray-800 bg-gray-900/80 text-gray-500 uppercase tracking-wide">
          Unavailable
        </span>
      ) : (
        <Link
          href={buyHref}
          className="mt-4 w-full min-h-[48px] flex items-center justify-center py-3 text-sm aura-brush-btn rounded-sm touch-manipulation"
        >
          Buy now
        </Link>
      )}
    </motion.article>
  );
};

export default AuraProductCard;
