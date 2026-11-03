'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Instagram,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  CHAT_WITH_US_CONFIG_COLLECTION,
  CHAT_WITH_US_CONFIG_DOC_ID,
  DEFAULT_CHAT_WITH_US_CONFIG,
  parseChatWithUsConfig,
  type ChatWithUsConfig,
} from '@/types/chat-with-us-config';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type ChannelCardProps = {
  title: string;
  description: string;
  badge: string;
  onClick: () => void;
  delay: number;
  variant: 'instagram' | 'whatsapp';
};

function ChannelCard({ title, description, badge, onClick, delay, variant }: ChannelCardProps) {
  const isInstagram = variant === 'instagram';

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 ${
        isInstagram
          ? 'border-pink-500/25 bg-gradient-to-br from-pink-500/10 via-dark-800/90 to-dark-800 hover:border-pink-400/45 hover:shadow-[0_0_32px_rgba(236,72,153,0.15)] focus-visible:ring-pink-400'
          : 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-dark-800/90 to-dark-800 hover:border-emerald-400/45 hover:shadow-[0_0_32px_rgba(52,211,153,0.12)] focus-visible:ring-emerald-400'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105 ${
            isInstagram
              ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
              : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
          }`}
        >
          {isInstagram ? (
            <Instagram className="h-7 w-7" strokeWidth={2} />
          ) : (
            <WhatsAppIcon className="h-7 w-7" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-lg font-semibold text-white">{title}</span>
            <span
              className={`text-[0.6875rem] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${
                isInstagram
                  ? 'bg-pink-500/15 text-pink-300 border border-pink-500/20'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
              }`}
            >
              {badge}
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-snug">{description}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
            isInstagram
              ? 'border-pink-500/20 bg-pink-500/5 text-pink-300 group-hover:bg-pink-500/15 group-hover:border-pink-400/40'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300 group-hover:bg-emerald-500/15 group-hover:border-emerald-400/40'
          }`}
        >
          <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

function ChannelSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-[5.5rem] rounded-2xl border border-gray-700/60 bg-dark-800/60 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function ChatWithUsPage() {
  const [config, setConfig] = useState<ChatWithUsConfig>(DEFAULT_CHAT_WITH_US_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    try {
      const snap = await getDoc(
        doc(db, CHAT_WITH_US_CONFIG_COLLECTION, CHAT_WITH_US_CONFIG_DOC_ID)
      );
      setConfig(parseChatWithUsConfig(snap.data() as Record<string, unknown> | undefined));
    } catch (error) {
      console.error('Load chat links:', error);
      toast.error('Could not load chat links. Using defaults.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const openLink = (url: string, label: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error(`${label} is not set yet. Please try again later.`);
      return;
    }
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  };

  return (
    <Layout>
      <section className="relative min-h-[85vh] flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(100%,36rem)] h-64 bg-primary-500/15 rounded-full blur-[100px]" />
          <div className="absolute top-32 -left-20 w-72 h-72 bg-pink-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-24 -right-16 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10 flex-1 flex flex-col">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400 text-sm mb-10 w-fit transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="text-center mb-8"
              >
                <span className="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-5">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  We&apos;re here to help
                </span>

                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
                  Chat with <span className="gradient-text">us</span>
                </h1>
                <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                  Choose your favourite app — we&apos;ll take you straight to our team in a new tab.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="rounded-3xl border border-gray-700/70 bg-dark-800/70 backdrop-blur-md p-5 sm:p-7 shadow-2xl shadow-black/30"
              >
                <div className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-5 pb-4 border-b border-gray-700/60">
                  <Sparkles className="w-4 h-4 text-primary-400" />
                  Pick a channel
                </div>

                {isLoading ? (
                  <ChannelSkeleton />
                ) : (
                  <div className="space-y-3">
                    <ChannelCard
                      variant="instagram"
                      title="Chat on Instagram"
                      description="Send us a DM for events, collabs, or quick questions."
                      badge="Instagram"
                      delay={0.2}
                      onClick={() => openLink(config.instagramUrl, 'Instagram')}
                    />
                    <ChannelCard
                      variant="whatsapp"
                      title="Chat on WhatsApp"
                      description="Message us directly — great for bookings and same-day help."
                      badge="WhatsApp"
                      delay={0.28}
                      onClick={() => openLink(config.whatsappUrl, 'WhatsApp')}
                    />
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-gray-700/60 flex items-start gap-3 text-left">
                  <Clock className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-center text-sm text-gray-500 mt-8"
              >
                Not ready to chat?{' '}
                <Link
                  href="/events"
                  className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 hover:underline"
                >
                  Explore events
                </Link>{' '}
                or{' '}
                <Link
                  href="/contact"
                  className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 hover:underline"
                >
                  contact page
                </Link>
              </motion.p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
