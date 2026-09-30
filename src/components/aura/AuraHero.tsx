'use client';

import React from 'react';
import { motion } from 'framer-motion';

const AuraHero: React.FC = () => {
  return (
    <section className="relative pt-24 sm:pt-28 pb-8 sm:pb-10 md:pt-32 md:pb-14 overflow-hidden bg-black">
      <div className="absolute inset-0 aura-gold-line top-auto bottom-0 opacity-60" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <p className="text-aura-gold/80 text-[11px] md:text-xs tracking-[0.25em] sm:tracking-[0.4em] uppercase mb-4">
            unigather Fragrance
          </p>
          <h1 className="font-aura-display text-4xl sm:text-5xl md:text-6xl text-white leading-[1.1] mb-5">
            Buy Your <span className="gradient-text-aura italic">Aura</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl">
            Tap a fragrance to explore every detail from our atelier — then buy when you&apos;re ready.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AuraHero;
