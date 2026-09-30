'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import AuraProductDetailContent from '@/components/aura/AuraProductDetailContent';

function DetailFallback() {
  return (
    <Layout>
      <section className="aura-page-bg min-h-screen pt-24 sm:pt-28">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-aura-gold animate-spin" />
          <p className="text-gray-500 text-sm mt-4">Loading fragrance…</p>
        </div>
      </section>
      <ChatBot />
    </Layout>
  );
}

export default function AuraProductDetailPage() {
  return (
    <Suspense fallback={<DetailFallback />}>
      <AuraProductDetailContent />
    </Suspense>
  );
}
