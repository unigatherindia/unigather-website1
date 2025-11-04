'use client';

import React, { Suspense, lazy, useEffect } from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import HeroSection from '@/components/home/HeroSection';
import AboutSection from '@/components/home/AboutSection';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Lazy load components that are below the fold
const StatsSection = lazy(() => import('@/components/home/StatsSection'));
const VideoSection = lazy(() => import('@/components/home/VideoSection'));
const GallerySection = lazy(() => import('@/components/home/GallerySection'));
const TestimonialSection = lazy(() => import('@/components/home/TestimonialSection'));
const CTASection = lazy(() => import('@/components/home/CTASection'));

// Loading component
const SectionLoader = () => (
  <div className="py-20 bg-dark-900 flex justify-center items-center">
    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/sign-in?redirect=/');
    }
  }, []);

  return (
    <Layout>
      <HeroSection />
      <Suspense fallback={<SectionLoader />}>
        <GallerySection />
      </Suspense>
      <AboutSection />
      <Suspense fallback={<SectionLoader />}>
        <StatsSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <VideoSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <TestimonialSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CTASection />
      </Suspense>
      <ChatBot />
    </Layout>
  );
}

