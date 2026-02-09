'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, MapPin, Clock, Star, 
  IndianRupee, ChevronRight, Ticket, Loader2, Users, User, UserCheck
} from 'lucide-react';
import BookingModal from './BookingModal';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface Event {
  id: string;
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
    couple?: number;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events from Firestore
  useEffect(() => {
    const fetchEvents = async () => {
      if (!db) {
        console.warn('Firebase is not initialized');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const eventsCollection = collection(db, 'events');
        
        // Try with orderBy, fallback to simple query if index is missing
        let querySnapshot;
        try {
          const eventsQuery = query(eventsCollection, orderBy('createdAt', 'desc'));
          querySnapshot = await getDocs(eventsQuery);
        } catch (orderError: any) {
          if (orderError.code === 'failed-precondition') {
            console.warn('Index not found, fetching without orderBy');
            querySnapshot = await getDocs(eventsCollection);
          } else {
            throw orderError;
          }
        }

        const eventsData: Event[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Handle createdAt - could be Timestamp or string
          let dateStr = data.date;
          if (!dateStr && data.createdAt) {
            if (data.createdAt instanceof Timestamp) {
              dateStr = data.createdAt.toDate().toISOString().split('T')[0];
            }
          }

          return {
            id: doc.id,
            title: data.title || 'Untitled Event',
            description: data.description || '',
            category: data.category || 'Social',
            date: dateStr || new Date().toISOString().split('T')[0],
            time: data.time || '12:00',
            location: data.location || '',
            address: data.address || '',
            price: {
              male: data.priceMale || 0,
              female: data.priceFemale || 0,
              couple: data.priceCouple || undefined
            },
            maxCapacity: data.maxCapacity || 0,
            currentParticipants: data.currentParticipants || { male: 0, female: 0, couple: 0 },
            rating: data.rating || 0,
            reviews: data.reviews || 0,
            difficulty: data.difficulty || 'Easy',
            duration: data.duration || '',
            highlights: data.highlights || [],
            organizer: data.organizer || {
              name: 'Unigather',
              avatar: '/api/placeholder/40/40',
              rating: 0
            },
            image: data.image || '/api/placeholder/600/400',
            featured: data.featured || false
          };
        });

        setEvents(eventsData);
      } catch (error: any) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading events...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
        <p className="text-gray-400">Check back soon for exciting events!</p>
      </div>
    );
  }

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

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                {event.image && event.image !== '/api/placeholder/600/400' ? (
                  <>
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 text-white mx-auto mb-2 drop-shadow-lg" />
                        <p className="text-white font-semibold drop-shadow-lg">{event.category} Event</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-primary-400/20 flex items-center justify-center">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                        <p className="text-white font-semibold">{event.category} Event</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </>
                )}
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
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
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

                {/* Availability Notice */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-300">
                      <Users className="w-4 h-4 mr-2 text-primary-400" />
                      <span>Limited Seats Left</span>
                    </div>
                  </div>
                </div>

                {/* Organizer removed per design */}

                {/* Pricing */}
                <div className="bg-dark-800 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">Ticket Prices</span>
                    <IndianRupee className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className={`grid gap-3 ${event.price.couple && event.price.couple !== 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="text-center">
                      <div className="text-blue-400 text-sm mb-1">Male</div>
                      <div className="text-white font-bold">₹{event.price.male}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-pink-400 text-sm mb-1">Female</div>
                      <div className="text-white font-bold">₹{event.price.female}</div>
                    </div>
                    {event.price.couple && event.price.couple !== 0 && (
                      <div className="text-center">
                        <div className="text-purple-400 text-sm mb-1">Couple</div>
                        <div className="text-white font-bold">₹{event.price.couple}</div>
                      </div>
                    )}
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
