'use client';

import React from 'react';
import Layout from '@/components/Layout';
import EventsHero from '@/components/events/EventsHero';
import EventsList from '@/components/events/EventsList';

export default function EventsPage() {
  return (
    <Layout>
      <EventsHero />
      <section className="py-16 bg-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <EventsList />
        </div>
      </section>
    </Layout>
  );
}
