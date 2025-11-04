'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Heart, Zap, Award, Globe } from 'lucide-react';

const AboutSection: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Diverse Community',
      description: 'Connect with people from all walks of life, backgrounds, and interests.',
      color: 'text-blue-400'
    },
    {
      icon: Target,
      title: 'Curated Events',
      description: 'Carefully planned activities designed to break ice and build genuine connections.',
      color: 'text-green-400'
    },
    {
      icon: Heart,
      title: 'Meaningful Bonds',
      description: 'Foster deep friendships that go beyond surface-level interactions.',
      color: 'text-red-400'
    },
    {
      icon: Zap,
      title: 'High Energy',
      description: 'Every event is packed with excitement, fun activities, and positive vibes.',
      color: 'text-yellow-400'
    },
    {
      icon: Award,
      title: 'Safe Environment',
      description: 'Verified members and moderated events ensure a secure experience for all.',
      color: 'text-purple-400'
    },
    {
      icon: Globe,
      title: 'City-wide Reach',
      description: 'Events across multiple locations, making it easy to participate anywhere.',
      color: 'text-cyan-400'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section id="about" className="py-20 bg-dark-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-30"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-400/3 rounded-full blur-3xl"></div>
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
            About Unigather
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Who We Are & <span className="gradient-text">What We Do</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We're a passionate community dedicated to creating meaningful connections between strangers. 
            Through carefully crafted events and activities, we transform awkward first meetings into 
            lasting friendships.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Left Column - Story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-3xl font-bold text-white mb-6">
              Our Journey of <span className="gradient-text">Connection</span>
            </h3>
            <div className="space-y-4 text-gray-300">
              <p className="text-lg leading-relaxed">
                It all started with a simple belief: the best relationships begin with a single "hello" 
                between strangers. In a world that's increasingly digital, we saw the need for genuine, 
                face-to-face connections.
              </p>
              <p className="text-lg leading-relaxed">
                Since our inception, we've hosted over 500 events across 25+ cities, helping more than 
                10,000 people discover friendships they never knew they needed. From intimate coffee 
                meetups to large adventure outings, every event is designed with one goal: turning 
                strangers into lifelong friends.
              </p>
              <p className="text-lg leading-relaxed">
                What makes us special isn't just the events we host—it's the community we've built. 
                A community where everyone belongs, where differences are celebrated, and where every 
                person has the potential to find their tribe.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="pt-6"
            >
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-primary-500/10 to-primary-400/10 rounded-2xl border border-primary-500/20">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white mb-1">Our Mission</h4>
                  <p className="text-gray-300">
                    To create a world where no one feels alone, one connection at a time.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-dark-700 to-dark-800 p-8 rounded-3xl border border-gray-700">
              {/* Connection Visualization */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      index === 4 
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white text-2xl' 
                        : 'bg-dark-600 text-gray-400'
                    }`}
                  >
                    {index === 4 ? <Users className="w-8 h-8" /> : <Users className="w-6 h-6" />}
                  </motion.div>
                ))}
              </div>
              
              <div className="text-center">
                <h4 className="text-xl font-semibold text-white mb-2">
                  The Unigather Effect
                </h4>
                <p className="text-gray-300 text-sm">
                  One person connects with eight others, creating a ripple effect of friendship 
                  that extends far beyond our events.
                </p>
              </div>

              {/* Floating Stats */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-dark-900 border border-primary-500/30 p-3 rounded-xl"
              >
                <div className="text-2xl font-bold gradient-text">98%</div>
                <div className="text-xs text-gray-400">Happy Rate</div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                className="absolute -bottom-4 -left-4 bg-dark-900 border border-primary-500/30 p-3 rounded-xl"
              >
                <div className="text-2xl font-bold gradient-text">24/7</div>
                <div className="text-xs text-gray-400">Community</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group p-4 sm:p-5 md:p-6 bg-dark-700/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl hover:border-primary-500/30 transition-all duration-300 transform origin-top-left scale-[0.6] sm:scale-90 md:scale-100 hover:scale-[0.62] sm:hover:scale-95 md:hover:scale-105"
              >
                <div className={`inline-flex p-2.5 sm:p-3 rounded-xl bg-dark-600 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-primary-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
