'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Users, Calendar, MapPin, Star, Trophy, Clock } from 'lucide-react';

const StatsSection: React.FC = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    {
      icon: Users,
      number: 10247,
      label: 'Friends Made',
      description: 'Lasting connections formed',
      color: 'from-blue-500 to-blue-400'
    },
    {
      icon: Calendar,
      number: 567,
      label: 'Events Hosted',
      description: 'Memorable experiences created',
      color: 'from-primary-500 to-primary-400'
    },
    {
      icon: MapPin,
      number: 28,
      label: 'Cities Covered',
      description: 'Across India and growing',
      color: 'from-green-500 to-green-400'
    },
    {
      icon: Star,
      number: 4.9,
      label: 'Average Rating',
      suffix: '/5',
      description: 'From participant feedback',
      color: 'from-yellow-500 to-yellow-400'
    },
    {
      icon: Trophy,
      number: 156,
      label: 'Success Stories',
      description: 'Friendships that became families',
      color: 'from-purple-500 to-purple-400'
    },
    {
      icon: Clock,
      number: 2.5,
      label: 'Years Strong',
      description: 'Building communities since 2022',
      color: 'from-pink-500 to-pink-400'
    }
  ];

  const [animatedStats, setAnimatedStats] = useState(
    stats.map(() => ({ displayNumber: 0, hasStarted: false }))
  );

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
      
      // Animate numbers
      stats.forEach((stat, index) => {
        if (!animatedStats[index].hasStarted) {
          animateNumber(index, stat.number);
        }
      });
    }
  }, [isInView, controls]);

  const animateNumber = (index: number, target: number) => {
    setAnimatedStats(prev => {
      const newStats = [...prev];
      newStats[index].hasStarted = true;
      return newStats;
    });

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      
      if (step >= steps) {
        current = target;
        clearInterval(timer);
      }

      setAnimatedStats(prev => {
        const newStats = [...prev];
        newStats[index].displayNumber = current;
        return newStats;
      });
    }, duration / steps);
  };

  const formatNumber = (num: number, suffix?: string) => {
    if (suffix === '/5') {
      return num.toFixed(1) + suffix;
    }
    
    if (num >= 10000) {
      return (num / 1000).toFixed(1) + 'K' + (suffix || '');
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K' + (suffix || '');
    } else if (num < 10 && num % 1 !== 0) {
      return num.toFixed(1) + (suffix || '');
    }
    
    return Math.round(num).toString() + (suffix || '');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.8 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        duration: 0.6,
        bounce: 0.3
      }
    }
  };

  return (
    <section className="py-20 bg-dark-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-gradient-radial from-primary-500/5 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-2 h-2 bg-primary-400 rounded-full animate-ping"></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-primary-300 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-primary-500 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 right-20 w-1 h-1 bg-primary-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-4">
            Our Impact
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            What We've <span className="gradient-text">Achieved Together</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Numbers tell a story, but behind each statistic are real people, real friendships, 
            and real memories that will last a lifetime.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          animate={controls}
          initial="hidden"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const displayValue = formatNumber(animatedStats[index].displayNumber, stat.suffix);
            
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="group relative"
              >
                <div className="relative p-8 bg-gradient-to-br from-dark-800 to-dark-700 rounded-3xl border border-gray-700/50 hover:border-primary-500/30 transition-all duration-500 overflow-hidden">
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  {/* Floating Icon Background */}
                  <div className="absolute top-4 right-4 opacity-10">
                    <Icon className="w-20 h-20 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${stat.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="mb-4">
                      <motion.div 
                        className="text-4xl md:text-5xl font-bold text-white mb-2"
                        initial={{ scale: 1 }}
                        whileInView={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        {displayValue}
                      </motion.div>
                      <h3 className="text-xl font-semibold text-gray-200 mb-2">
                        {stat.label}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {stat.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-dark-600 rounded-full h-1 overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        transition={{ duration: 1.5, delay: index * 0.2 }}
                        viewport={{ once: true }}
                      />
                    </div>
                  </div>

                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/20 to-primary-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ padding: '1px' }}>
                    <div className="w-full h-full bg-dark-800 rounded-3xl"></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-300 mb-6">
            Ready to become part of these amazing statistics?
          </p>
          <a href="/events">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-primary-500 to-primary-400 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-primary-600 hover:to-primary-500 transition-all duration-300 glow-effect"
            >
              Join Our Next Event
            </motion.button>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
