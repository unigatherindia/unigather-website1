'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, ArrowLeft, ArrowRight, Users } from 'lucide-react';

const TestimonialSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'Priya Sharma',
      role: 'Software Developer',
      location: 'Mumbai',
      avatar: '/api/placeholder/80/80',
      rating: 5,
      text: "I was skeptical about meeting strangers, but Unigather changed everything! I've made my closest friends through their events. The hiking trip last month was incredible - we're still planning our next adventure together!",
      event: 'Mountain Trek Adventure',
      friendsMade: 8
    },
    {
      id: 2,
      name: 'Rajesh Kumar',
      role: 'Marketing Manager',
      location: 'Bangalore',
      avatar: '/api/placeholder/80/80',
      rating: 5,
      text: "Moving to a new city was lonely until I found Unigather. The cooking workshop not only taught me new recipes but also introduced me to amazing people. Now we have monthly potlucks!",
      event: 'Culinary Connections',
      friendsMade: 12
    },
    {
      id: 3,
      name: 'Anisha Patel',
      role: 'Graphic Designer',
      location: 'Delhi',
      avatar: '/api/placeholder/80/80',
      rating: 5,
      text: "The creative workshops are fantastic! I've not only improved my skills but also found my creative community. We collaborate on projects now and support each other's artistic journey.",
      event: 'Creative Canvas Night',
      friendsMade: 6
    },
    {
      id: 4,
      name: 'Vikram Singh',
      role: 'Fitness Trainer',
      location: 'Pune',
      avatar: '/api/placeholder/80/80',
      rating: 5,
      text: "Unigather events are perfectly organized and so much fun! The beach cleanup event was meaningful and I met people who share my values. We've started our own environmental group!",
      event: 'Beach Cleanup Adventure',
      friendsMade: 15
    },
    {
      id: 5,
      name: 'Meera Reddy',
      role: 'Teacher',
      location: 'Hyderabad',
      avatar: '/api/placeholder/80/80',
      rating: 5,
      text: "As an introvert, making friends was always challenging. Unigather's structured activities made it so natural and comfortable. The game nights are my favorite - always full of laughter!",
      event: 'Board Game Bonanza',
      friendsMade: 9
    }
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 bg-dark-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary-400/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating Quote Icons */}
        <div className="absolute top-20 left-1/4 opacity-10">
          <Quote className="w-24 h-24 text-primary-400 transform rotate-12" />
        </div>
        <div className="absolute bottom-20 right-1/3 opacity-10">
          <Quote className="w-32 h-32 text-primary-400 transform -rotate-12" />
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
            <Users className="w-4 h-4 inline mr-2" />
            Community Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            What Our <span className="gradient-text">Community Says</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real stories from real people who found their tribe through Unigather. 
            These friendships started with a single event and grew into something beautiful.
          </p>
        </motion.div>

        {/* Main Testimonial */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-3xl p-8 md:p-12 border border-gray-700/50 relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-500 to-transparent rounded-full transform translate-x-32 -translate-y-32"></div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8 items-center relative z-10">
                {/* Testimonial Content */}
                <div className="lg:col-span-2">
                  <div className="flex items-center mb-6">
                    <Quote className="w-12 h-12 text-primary-400 mr-4" />
                    <div className="flex space-x-1">
                      {[...Array(currentTestimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>

                  <blockquote className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 font-light">
                    "{currentTestimonial.text}"
                  </blockquote>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-primary-500/10 rounded-full border border-primary-500/20">
                      <Users className="w-4 h-4 text-primary-400" />
                      <span className="text-primary-400 text-sm font-medium">
                        {currentTestimonial.friendsMade} friends made
                      </span>
                    </div>
                    <div className="px-4 py-2 bg-dark-600 rounded-full">
                      <span className="text-gray-300 text-sm">
                        Event: {currentTestimonial.event}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Author Info */}
                <div className="text-center lg:text-left">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto lg:mx-0">
                      <Users className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-dark-800 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    {currentTestimonial.name}
                  </h3>
                  <p className="text-primary-400 font-medium mb-1">
                    {currentTestimonial.role}
                  </p>
                  <p className="text-gray-400 text-sm">
                    📍 {currentTestimonial.location}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-white transition-colors duration-300 hover:text-primary-400"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-primary-500 w-8'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextTestimonial}
              className="w-12 h-12 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-white transition-colors duration-300 hover:text-primary-400"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">4.9/5</div>
            <div className="text-gray-300">Average Rating</div>
            <div className="text-sm text-gray-400">From 2,847+ reviews</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">96%</div>
            <div className="text-gray-300">Would Recommend</div>
            <div className="text-sm text-gray-400">To friends & family</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">10K+</div>
            <div className="text-gray-300">Happy Members</div>
            <div className="text-sm text-gray-400">And growing daily</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialSection;
