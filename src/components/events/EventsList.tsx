'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, MapPin, Users, Clock, Star, Heart, Share2, 
  IndianRupee, User, UserCheck, ChevronRight, Ticket 
} from 'lucide-react';
import BookingModal from './BookingModal';

interface Event {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: {
    male: number;
    female: number;
  };
  maxCapacity: number;
  currentParticipants: {
    male: number;
    female: number;
  };
  rating: number;
  reviews: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  duration: string;
  highlights: string[];
  organizer: {
    name: string;
    avatar: string;
    rating: number;
  };
  image: string;
  featured: boolean;
}

const EventsList: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [likedEvents, setLikedEvents] = useState<number[]>([]);

  // Sample events data - in production, this would come from your database
  const events: Event[] = [
    {
      id: 1,
      title: 'Sunset Hiking & Photography',
      description: 'Capture breathtaking sunset views while making new friends on this guided hiking adventure.',
      category: 'Outdoor',
      date: '2025-09-28',
      time: '16:00',
      location: 'Sahyadri Hills',
      address: 'Lonavala, Maharashtra',
      price: { male: 899, female: 799 },
      maxCapacity: 25,
      currentParticipants: { male: 8, female: 12 },
      rating: 4.8,
      reviews: 156,
      difficulty: 'Moderate',
      duration: '4 hours',
      highlights: ['Professional Photography Tips', 'Sunset Views', 'Group Bonding'],
      organizer: {
        name: 'Rohan Adventure Club',
        avatar: '/api/placeholder/40/40',
        rating: 4.9
      },
      image: '/api/placeholder/600/400',
      featured: true
    },
    {
      id: 2,
      title: 'Cooking Workshop: Italian Cuisine',
      description: 'Learn authentic Italian recipes while bonding with fellow food enthusiasts.',
      category: 'Creative',
      date: '2025-09-29',
      time: '18:00',
      location: 'Culinary Studio',
      address: 'Bandra West, Mumbai',
      price: { male: 1299, female: 1199 },
      maxCapacity: 16,
      currentParticipants: { male: 4, female: 8 },
      rating: 4.9,
      reviews: 89,
      difficulty: 'Easy',
      duration: '3 hours',
      highlights: ['3-Course Meal', 'Chef Guidance', 'Recipe Book'],
      organizer: {
        name: 'Chef Maria\'s Kitchen',
        avatar: '/api/placeholder/40/40',
        rating: 4.8
      },
      image: '/api/placeholder/600/400',
      featured: false
    },
    {
      id: 3,
      title: 'Stand-up Comedy Night',
      description: 'Laugh your heart out with local comedians and meet people who share your sense of humor.',
      category: 'Social',
      date: '2025-09-30',
      time: '20:00',
      location: 'Comedy Club Central',
      address: 'Koramangala, Bangalore',
      price: { male: 599, female: 499 },
      maxCapacity: 40,
      currentParticipants: { male: 15, female: 18 },
      rating: 4.7,
      reviews: 203,
      difficulty: 'Easy',
      duration: '2.5 hours',
      highlights: ['Live Comedy', 'Networking Break', 'Welcome Drinks'],
      organizer: {
        name: 'Laugh Out Loud Events',
        avatar: '/api/placeholder/40/40',
        rating: 4.6
      },
      image: '/api/placeholder/600/400',
      featured: true
    }
  ];

  const toggleLike = (eventId: number) => {
    setLikedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-500/20';
      case 'Moderate': return 'text-yellow-400 bg-yellow-500/20';
      case 'Challenging': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Outdoor': return 'text-green-400 bg-green-500/20';
      case 'Creative': return 'text-purple-400 bg-purple-500/20';
      case 'Social': return 'text-blue-400 bg-blue-500/20';
      case 'Professional': return 'text-cyan-400 bg-cyan-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8"
      >
        {events.map((event, index) => {
          const totalParticipants = event.currentParticipants.male + event.currentParticipants.female;
          const occupancyPercentage = (totalParticipants / event.maxCapacity) * 100;
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`group relative bg-dark-700 rounded-3xl overflow-hidden border transition-all duration-500 hover:transform hover:scale-[1.02] ${
                event.featured 
                  ? 'border-primary-500/50 shadow-lg shadow-primary-500/20' 
                  : 'border-gray-700/50 hover:border-primary-500/30'
              }`}
            >
              {/* Featured Badge */}
              {event.featured && (
                <div className="absolute top-4 left-4 z-20">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Featured</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 z-20 flex space-x-2">
                <button
                  onClick={() => toggleLike(event.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${
                    likedEvents.includes(event.id)
                      ? 'bg-red-500/80 text-white'
                      : 'bg-black/40 text-gray-300 hover:bg-red-500/80 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${likedEvents.includes(event.id) ? 'fill-current' : ''}`} />
                </button>
                <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-gray-300 hover:text-white transition-colors flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-primary-400/20 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">{event.category} Event</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                        {event.category}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(event.difficulty)}`}>
                        {event.difficulty}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-300 text-sm">
                    <Calendar className="w-4 h-4 mr-3 text-primary-400" />
                    <span>{formatDate(event.date)} at {event.time}</span>
                  </div>
                  <div className="flex items-center text-gray-300 text-sm">
                    <MapPin className="w-4 h-4 mr-3 text-primary-400" />
                    <span>{event.location}, {event.address}</span>
                  </div>
                  <div className="flex items-center text-gray-300 text-sm">
                    <Clock className="w-4 h-4 mr-3 text-primary-400" />
                    <span>{event.duration}</span>
                  </div>
                </div>

                {/* Participants */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-sm text-gray-300">
                      <Users className="w-4 h-4 mr-2 text-primary-400" />
                      <span>{totalParticipants}/{event.maxCapacity} joined</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {Math.round(occupancyPercentage)}% full
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-dark-600 rounded-full h-2 overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                  </div>

                  {/* Gender Split */}
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-blue-400" />
                      <span className="text-gray-400">{event.currentParticipants.male} male</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 text-pink-400" />
                      <span className="text-gray-400">{event.currentParticipants.female} female</span>
                    </div>
                  </div>
                </div>

                {/* Rating & Organizer */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-white font-medium">{event.rating}</span>
                    </div>
                    <span className="text-gray-400 text-sm">({event.reviews} reviews)</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    by {event.organizer.name}
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-dark-800 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">Ticket Prices</span>
                    <IndianRupee className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-blue-400 text-sm mb-1">Male</div>
                      <div className="text-white font-bold">₹{event.price.male}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-pink-400 text-sm mb-1">Female</div>
                      <div className="text-white font-bold">₹{event.price.female}</div>
                    </div>
                  </div>
                </div>

                {/* Book Button */}
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 group"
                  disabled={totalParticipants >= event.maxCapacity}
                >
                  {totalParticipants >= event.maxCapacity ? (
                    <>
                      <Ticket className="w-5 h-5" />
                      <span>Event Full</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" />
                      <span>Book Now</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Load More Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="text-center mt-12"
      >
        <button className="px-8 py-3 bg-dark-700 border border-gray-600 text-white rounded-full font-medium hover:bg-dark-600 hover:border-primary-500 transition-all duration-300">
          Load More Events
        </button>
      </motion.div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <BookingModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default EventsList;
