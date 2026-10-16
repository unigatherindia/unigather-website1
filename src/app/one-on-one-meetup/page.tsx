'use client';

import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import BeyondHellosSection from '@/components/meetup/BeyondHellosSection';
import { motion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import { BEYOND_HELLOS_INTRO, ONE_ON_ONE_MEETUP_LABEL } from '@/constants/beyond-hellos-copy';

export default function OneOnOneMeetupPage() {
  return (
    <Layout>
      <section className="relative min-h-[40vh] flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-6">
              <HeartHandshake className="w-4 h-4 mr-2" />
              Unigather presents
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Welcome to Unigather&apos;s{' '}
              <span className="gradient-text">{ONE_ON_ONE_MEETUP_LABEL}</span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">{BEYOND_HELLOS_INTRO}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <BeyondHellosSection />
        </div>
      </section>

      <ChatBot />
    </Layout>
  );
}
