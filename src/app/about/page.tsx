'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { 
  Users, Heart, Target, Star, Award, Clock, 
  MapPin, Calendar, Lightbulb, Zap, Shield, Globe, Loader2 
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // Predefined founders - these will always be displayed
  const founders = [
    {
      name: 'Vansh Miglani',
      role: 'Founder & CEO',
      bio: 'Former tech executive who believes in the power of human connections. Started Unigather after moving to a new city and struggling to make friends.',
      avatar: '/media/VANSH.jpeg',
      linkedin: '#'
    },
    {
      name: 'Jai Vardhan',
      role: 'Co-Founder & CTO',
      bio: 'Computer Science graduate and technology enthusiast. Passionate about leveraging technology to create meaningful connections and building scalable platforms that bring people together.',
      avatar: '/media/jai.JPG',
      linkedin: '#'
    }
  ];

  // Fetch team members from Firestore
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!db) {
        setIsLoadingTeam(false);
        return;
      }

      try {
        setIsLoadingTeam(true);
        const teamCollection = collection(db, 'teamMembers');
        const q = query(teamCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const members = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          role: doc.data().designation,
          bio: doc.data().description,
          avatar: doc.data().imageUrl,
          linkedin: '#'
        }));

        setTeamMembers(members);
      } catch (error: any) {
        console.error('Error fetching team members:', error);
        // Continue even if fetch fails - still show founders
      } finally {
        setIsLoadingTeam(false);
      }
    };

    fetchTeamMembers();
  }, []);

  // Combine founders with team members from Firestore
  const allTeamMembers = [...founders, ...teamMembers];

  const values = [
    {
      icon: Heart,
      title: 'Authenticity',
      description: 'We believe in genuine connections and authentic relationships. No fake personas, just real people being themselves.',
      color: 'text-red-400'
    },
    {
      icon: Users,
      title: 'Inclusivity',
      description: 'Everyone is welcome regardless of background, profession, or social status. Diversity makes our community stronger.',
      color: 'text-blue-400'
    },
    {
      icon: Shield,
      title: 'Safety',
      description: 'Creating safe spaces where people can be vulnerable and open to new friendships without fear or judgment.',
      color: 'text-green-400'
    },
    {
      icon: Zap,
      title: 'Growth',
      description: 'Every interaction is an opportunity to learn, grow, and step outside your comfort zone in a supportive environment.',
      color: 'text-yellow-400'
    },
    {
      icon: Globe,
      title: 'Community',
      description: 'Building a global network of friends who support, inspire, and celebrate each other\'s journeys.',
      color: 'text-purple-400'
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Constantly evolving our approach to create better, more meaningful experiences for our community.',
      color: 'text-cyan-400'
    }
  ];

  const milestones = [
    {
      year: '2022',
      title: 'The Beginning',
      description: 'Started with a simple meetup in Mumbai with 12 strangers in a coffee shop.',
      participants: 12
    },
    {
      year: '2023',
      title: 'Growing Community',
      description: 'Expanded to 5 cities with over 1,000 active members and 50+ successful events.',
      participants: 1000
    },
    {
      year: '2024',
      title: 'Major Milestone',
      description: 'Crossed 5,000 friendships made and launched in 15+ cities across India.',
      participants: 5000
    },
    {
      year: '2025',
      title: 'Current Goal',
      description: 'Aiming for 25+ cities and 15,000+ community members by end of 2025.',
      participants: 15000
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-6">
              <Heart className="w-4 h-4 mr-2" />
              About Unigather
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Turning Strangers into <span className="gradient-text">Lifelong Friends</span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">
              We started with a simple belief: the best friendships often begin with a conversation 
              between strangers. Since 2022, we've been creating meaningful connections across India, 
              one event at a time.
            </p>

            <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {[
                { number: '10,000+', label: 'Friends Made' },
                { number: '500+', label: 'Events Hosted' },
                { number: '25+', label: 'Cities' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                  className="p-3 sm:p-4 md:p-6 bg-dark-700/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 transform origin-top-left scale-[0.1] sm:scale-[0.6] md:scale-100"
                >
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-1 sm:mb-2">
                    {stat.number}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-400">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Our <span className="gradient-text">Story</span>
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Like many great ideas, Unigather was born from a personal struggle. Our founder, 
              Arjun, moved to Mumbai for a new job and found himself surrounded by millions of 
              people yet feeling incredibly lonely.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="space-y-6 text-gray-300">
                <p className="text-lg leading-relaxed">
                  Traditional networking events felt forced and superficial. Dating apps were meant 
                  for romance, not friendship. Social media connections remained digital. There had 
                  to be a better way to meet genuine people who could become real friends.
                </p>
                <p className="text-lg leading-relaxed">
                  So in December 2022, Arjun organized a simple coffee meetup for "strangers who 
                  want to become friends." He posted it online, expecting maybe 5-6 people. 
                  Twenty-three showed up.
                </p>
                <p className="text-lg leading-relaxed">
                  That first meetup lasted four hours. People exchanged numbers, made plans to meet 
                  again, and most importantly, formed real connections. Three of those original 
                  attendees are now among Arjun's closest friends.
                </p>
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-6">
                  <blockquote className="text-lg italic text-primary-400">
                    "We realized we weren't just organizing events – we were creating a movement. 
                    A movement that says it's okay to be new in the city, it's okay to feel lonely, 
                    and it's definitely okay to want more friends."
                  </blockquote>
                  <cite className="block text-right text-gray-400 mt-4">- Arjun Patel, Founder</cite>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary-500/20 to-primary-400/10 rounded-3xl p-8 border border-primary-500/20">
                <div className="grid grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={milestone.year}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-center p-3 sm:p-3.5 md:p-4 bg-dark-800/50 rounded-2xl backdrop-blur-sm transform origin-top-left scale-[0.6] sm:scale-90 md:scale-100"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-primary-400 mb-1">
                        {milestone.year}
                      </div>
                      <div className="text-white font-semibold text-xs sm:text-sm mb-2">
                        {milestone.title}
                      </div>
                      <div className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                        {milestone.description}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-dark-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Our <span className="gradient-text">Values</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              These principles guide everything we do, from planning events to building 
              our community culture.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group p-5 sm:p-6 md:p-8 bg-dark-800 rounded-3xl border border-gray-700/50 hover:border-primary-500/30 transition-all duration-300 transform origin-top-left scale-[0.6] sm:scale-90 md:scale-100 hover:scale-[0.62] sm:hover:scale-95 md:hover:scale-105"
                >
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-dark-700 rounded-2xl mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${value.color}`} />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3 md:mb-4 group-hover:text-primary-400 transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Meet Our <span className="gradient-text">Team</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              The passionate individuals behind Unigather, working tirelessly to bring people 
              together and create meaningful connections.
            </p>
          </motion.div>

          {isLoadingTeam ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <span className="ml-3 text-gray-300">Loading team...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {allTeamMembers.map((member, index) => (
                <motion.div
                  key={member.id || member.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-gradient-to-r from-primary-500/30 to-primary-400/20 group-hover:scale-105 transition-transform duration-300 border-4 border-primary-500/20">
                      {member.avatar && (member.avatar.includes('/media/') || member.avatar.startsWith('http')) ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-20 h-20 text-primary-400" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-500/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-primary-400 font-medium mb-4">
                    {member.role}
                  </p>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {member.bio}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-primary-900/20 via-dark-900 to-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Join Our <span className="gradient-text">Community?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Whether you're new to the city or just looking to expand your social circle, 
              you'll find your place in our welcoming community.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary-500 to-primary-400 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-primary-600 hover:to-primary-500 transition-all duration-300 glow-effect"
              >
                Join Our Next Event
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-gray-600 text-white rounded-full font-semibold text-lg hover:border-primary-400 hover:text-primary-400 transition-all duration-300"
              >
                Contact Us
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
