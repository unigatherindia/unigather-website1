'use client';

import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import EventsHero from '@/components/events/EventsHero';

export default function EventsPage() {
  return (
    <Layout>
      <EventsHero />
      <ChatBot />
    </Layout>
  );
}
