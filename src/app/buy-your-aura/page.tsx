'use client';

import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import AuraHero from '@/components/aura/AuraHero';
import AuraProductsList from '@/components/aura/AuraProductsList';

export default function BuyYourAuraPage() {
  return (
    <Layout>
      <AuraHero />
      <section className="aura-page-bg min-h-screen overflow-x-hidden pb-28 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[100vw]">
          <AuraProductsList />
        </div>
      </section>
      <ChatBot />
    </Layout>
  );
}
