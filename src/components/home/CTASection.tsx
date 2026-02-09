'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Users, Heart, Star, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface EventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category?: string;
  maxCapacity?: number;
  location?: string;
  currentParticipants?: { male: number; female: number };
  status?: string;
}

const CTASection: React.FC = () => {
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const eventsCol = collection(db, 'events');
        const q = query(eventsCol, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const items: EventItem[] = snap.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            title: d.title || 'Untitled Event',
            date: d.date || new Date().toISOString().split('T')[0],
            time: d.time,
            category: d.category || 'Event',
            maxCapacity: d.maxCapacity || 0,
            location: d.location || '',
            currentParticipants: d.currentParticipants || { male: 0, female: 0 },
            status: d.status, // Include status for filtering
          };
        });
        const sorted = items
          .filter((e) => e.date && e.status !== 'archived') // Filter out archived events
          .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
        setUpcomingEvents(sorted.slice(0, 3));
      } catch (e) {
        setUpcomingEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpcoming();
  }, []);

  const totalParticipants = (e: EventItem) => {
    if (!e.currentParticipants) return 0;
    return (e.currentParticipants.male || 0) + (e.currentParticipants.female || 0);
    };

  const capacity = (e: EventItem) => e.maxCapacity || 0;

  const capacityPct = (e: EventItem) => {
    const cap = capacity(e);
    const participants = totalParticipants(e);
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((participants / cap) * 100));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Animated Background Circles */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3] 
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-10 left-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"
        ></motion.div>
        
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.3, 0.1] 
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 4 }}
          className="absolute bottom-10 right-10 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl"
        ></motion.div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [-20, 20, -20], rotate: [0, 180, 360] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/4 right-1/4 opacity-10"
        >
          <Sparkles className="w-8 h-8 text-primary-400" />
        </motion.div>
        
        <motion.div
          animate={{ y: [20, -20, 20], rotate: [360, 180, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute bottom-1/3 left-1/4 opacity-10"
        >
          <Heart className="w-10 h-10 text-primary-400" />
        </motion.div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {[...Array(144)].map((_, i) => (
              <div key={i} className="border border-primary-500/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Main CTA Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-8"
            >
              <Users className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Find Your <br />
              <span className="gradient-text">Perfect Tribe?</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join thousands of amazing people who've already discovered the magic of meaningful connections. 
              Your next best friend is just one event away.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <Link href="/events">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-gradient-to-r from-primary-500 to-primary-400 text-white px-10 py-4 rounded-full font-bold text-lg hover:from-primary-600 hover:to-primary-500 transition-all duration-300 glow-effect flex items-center"
                >
                  Join Our Next Event
                  <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              
              <Link href="/about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 border-2 border-gray-600 text-white rounded-full font-bold text-lg hover:border-primary-400 hover:text-primary-400 transition-all duration-300"
                >
                  Learn More
                </motion.button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center items-center gap-8 text-gray-400"
            >
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-medium">4.9/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary-400" />
                <span className="font-medium">10,000+ Happy Members</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-400" />
                <span className="font-medium">500+ Events Hosted</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Upcoming Events Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Don't Miss These <span className="gradient-text">Upcoming Events</span>
              </h3>
              <p className="text-gray-300">
                Secure your spot in these popular events - they're filling up fast!
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {(
                isLoading
                  ? (Array.from({ length: 3 }) as unknown as EventItem[])
                  : upcomingEvents
              ).map((event, index) => (
                <motion.div
                  key={isLoading ? index : event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="group bg-dark-800 border border-gray-700/50 rounded-2xl hover:border-primary-500/30 transition-all duration-300 relative overflow-hidden"
                >
                  <Link href="/events" className="block p-6">
                  {/* Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 group-hover:from-primary-500/5 to-transparent transition-all duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      {isLoading ? (
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-dark-600 text-gray-500">&nbsp;</div>
                      ) : (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (event.category || '') === 'Outdoor' ? 'bg-green-500/20 text-green-400' :
                          (event.category || '') === 'Creative' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {event.category || 'Event'}
                        </div>
                      )}
                      <div className="text-primary-400 font-bold text-sm">
                        {isLoading ? '...' : formatDate(event.date)}
                      </div>
                    </div>
                    
                    <h4 className="text-white font-bold text-lg mb-3 group-hover:text-primary-400 transition-colors">
                      {isLoading ? 'Loading...' : event.title}
                    </h4>
                    
                    <div className="text-gray-300 text-sm">
                      {isLoading ? 'Loading details...' : event.location || 'New experiences await'}
                    </div>
                  </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {!isLoading && upcomingEvents.length === 0 && (
              <div className="text-center text-gray-400 mt-4">No upcoming events yet. Check back soon!</div>
            )}
          </motion.div>

          {/* Final Encouragement */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center p-8 bg-gradient-to-r from-primary-500/10 via-primary-400/5 to-primary-500/10 rounded-3xl border border-primary-500/20"
          >
            <div className="max-w-2xl mx-auto">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Heart className="w-8 h-8 text-white fill-current" />
              </motion.div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Your Journey Starts <span className="gradient-text">Today</span>
              </h3>
              
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Every friendship begins with a single moment of connection. Take that first step, 
                join our community, and discover the incredible people waiting to meet you.
              </p>
              
              <p className="text-primary-400 font-semibold text-lg">
                "The best time to make new friends was yesterday. The second best time is now." ✨
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
