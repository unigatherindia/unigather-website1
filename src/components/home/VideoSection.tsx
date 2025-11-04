'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Heart, Star } from 'lucide-react';

const VideoSection: React.FC = () => {
  return (
    <section className="py-20 bg-dark-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-400/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
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
          <span className="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-6">
            <Play className="w-4 h-4 mr-2" />
            See Unigather in Action
          </span>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Watch How <span className="gradient-text">Strangers Become Friends</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Experience the magic of Unigather through our community members' eyes. See real connections 
            forming and friendships blooming at our events.
          </p>
        </motion.div>

        {/* Video Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative bg-dark-800 rounded-3xl overflow-hidden border border-gray-700/50 p-4 md:p-8">
            {/* Video Embed */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="https://www.youtube.com/embed/vkTj4z8nuaI?si=L6DQykX52JmChTGk"
                title="Unigather - How Stranger Meetup Events Happen"
                className="absolute top-0 left-0 w-full h-full rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            
            {/* Video Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Real Stories, Real Connections
                </h3>
                <p className="text-gray-400">
                  See how our community members meet, connect, and form lasting friendships
                </p>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Users className="w-4 h-4 text-primary-400" />
                  <span>1000+ Views</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span>Loved by Community</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Featured Story</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Below Video */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
        >
          {[
            {
              number: '500+',
              label: 'Events Like This',
              description: 'Successfully organized'
            },
            {
              number: '10,000+',
              label: 'Connections Made',
              description: 'Strangers turned friends'
            },
            {
              number: '98%',
              label: 'Satisfaction Rate',
              description: 'Would attend again'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-6 bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/30"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                {stat.number}
              </div>
              <div className="text-white font-semibold mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-400">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        
      </div>
    </section>
  );
};

export default VideoSection;
