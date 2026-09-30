// this us the hero section of the home page
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Calendar, Heart, ArrowRight, Play } from 'lucide-react';
import PerfumeBottleIcon from '@/components/icons/PerfumeBottleIcon';

const HeroSection: React.FC = () => {
  const stats = [
    { number: '10K+', label: 'Friends Made' },
    { number: '500+', label: 'Events Hosted' },
    { number: '25+', label: 'Cities' },
    { number: '98%', label: 'Satisfaction Rate' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Background Patterns */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary-500/5 to-transparent rounded-full"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left w-full max-w-full overflow-hidden px-2 sm:px-0">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-6"
              >
                <span className="inline-flex items-center px-3 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-xs sm:text-sm font-medium mb-4 mx-auto lg:mx-0 max-w-max">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">Welcome to Unigather</span>
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight px-2 sm:px-0">
                  <span className="gradient-text block">Gathering Minds</span>
                  <span className="text-white block">Uniting Hearts</span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-sm sm:text-base md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0 px-4 sm:px-0"
                style={{ 
                  wordWrap: 'break-word', 
                  overflowWrap: 'break-word',
                  maxWidth: '100%',
                  width: '100%'
                }}
              >
                Turn strangers into lifelong friends through exciting events and meaningful connections. 
                Every gathering is a new beginning, every stranger a potential best friend.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center lg:justify-start mb-12 w-full sm:max-w-none mx-auto lg:mx-0 px-1 sm:px-0"
              >
                <Link
                  href="/events"
                  className="hero-cta group box-border border-2 border-transparent bg-gradient-to-r from-primary-500 to-primary-400 text-white hover:from-primary-600 hover:to-primary-500 transition-all duration-300 glow-effect"
                >
                  Join Our Events
                  <ArrowRight className="hero-cta-icon ml-2 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/buy-your-aura"
                  className="hero-cta group relative box-border border-2 border-aura-gold/45 bg-black/40 text-aura-gold-light hover:border-aura-gold hover:shadow-[0_0_28px_rgba(212,175,55,0.25)] active:scale-[0.98] transition-all duration-300"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-aura-gold/15 via-transparent to-aura-gold/10 opacity-80 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none"
                    aria-hidden
                  />
                  <PerfumeBottleIcon className="hero-cta-icon mr-2 relative z-10 text-aura-gold group-hover:scale-110 transition-transform shrink-0" />
                  <span className="relative z-10 whitespace-nowrap">Buy Your Aura</span>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-400">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right Column - Visual Elements */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="relative origin-center scale-[0.7] sm:scale-100"
              >
                {/* Main Circle */}
                <div className="relative w-96 h-96 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-4 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute inset-8 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full opacity-60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Users className="w-16 h-16 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">Connect</h3>
                      <p className="text-sm opacity-90">Meet Amazing People</p>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-8 -right-4 bg-dark-700 border border-primary-500/20 p-4 rounded-2xl"
                >
                  <Calendar className="w-6 h-6 text-primary-400 mb-2" />
                  <div className="text-sm text-white font-medium">Next Event</div>
                  <div className="text-xs text-gray-400">This Weekend</div>
                </motion.div>

                <motion.div
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="absolute bottom-8 -left-4 bg-dark-700 border border-primary-500/20 p-4 rounded-2xl"
                >
                  <Heart className="w-6 h-6 text-red-400 mb-2" />
                  <div className="text-sm text-white font-medium">New Friends</div>
                  <div className="text-xs text-gray-400">Made Today: 24</div>
                </motion.div>

                {/* Connection Lines */}
                <motion.svg
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 400 400"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 1.2 }}
                    d="M200,200 Q300,100 350,50"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 1.4 }}
                    d="M200,200 Q100,300 50,350"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                      <stop offset="50%" stopColor="#f97316" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
