'use client';

import React, { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import HeroSection from '@/components/home/HeroSection';
import AboutSection from '@/components/home/AboutSection';

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
  return (
    <Layout>
      <HeroSection />
      <AboutSection />
      <Suspense fallback={<SectionLoader />}>
        <StatsSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <VideoSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <GallerySection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <TestimonialSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CTASection />
      </Suspense>
    </Layout>
  );
}

