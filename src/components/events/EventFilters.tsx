'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';

const EventFilters: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All Cities');
  const [selectedDate, setSelectedDate] = useState('All Dates');
  const [selectedPrice, setSelectedPrice] = useState('All Prices');

  const categories = [
    'All', 'Outdoor', 'Creative', 'Professional', 'Social', 'Adventure', 
    'Workshop', 'Sports', 'Food & Drink', 'Arts', 'Music', 'Technology'
  ];

  const locations = [
    'All Cities', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 
    'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur'
  ];

  const dateFilters = [
    'All Dates', 'Today', 'Tomorrow', 'This Weekend', 'Next Week', 'This Month'
  ];

  const priceFilters = [
    'All Prices', 'Free', 'Under ₹500', '₹500-1000', '₹1000-2000', '₹2000+'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="mb-12"
    >
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="w-6 h-6 text-primary-400" />
          <h2 className="text-2xl font-bold text-white">Filter Events</h2>
        </div>
        <button className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Clear All Filters
        </button>
      </div>

      {/* Filter Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Category Filter */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span className="font-medium">Category</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-300">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Location</span>
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">Date</span>
          </div>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
          >
            {dateFilters.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>

        {/* Price Filter */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-300">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">Price</span>
          </div>
          <select
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value)}
            className="w-full p-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
          >
            {priceFilters.map((price) => (
              <option key={price} value={price}>
                {price}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedCategory !== 'All' || selectedLocation !== 'All Cities' || selectedDate !== 'All Dates' || selectedPrice !== 'All Prices') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-6 pt-6 border-t border-gray-700"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-300 font-medium">Active filters:</span>
            {selectedCategory !== 'All' && (
              <span className="px-3 py-1 bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded-full text-sm flex items-center space-x-2">
                <Users className="w-3 h-3" />
                <span>{selectedCategory}</span>
                <button onClick={() => setSelectedCategory('All')} className="ml-1 hover:text-primary-300">×</button>
              </span>
            )}
            {selectedLocation !== 'All Cities' && (
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-sm flex items-center space-x-2">
                <MapPin className="w-3 h-3" />
                <span>{selectedLocation}</span>
                <button onClick={() => setSelectedLocation('All Cities')} className="ml-1 hover:text-green-300">×</button>
              </span>
            )}
            {selectedDate !== 'All Dates' && (
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-full text-sm flex items-center space-x-2">
                <Calendar className="w-3 h-3" />
                <span>{selectedDate}</span>
                <button onClick={() => setSelectedDate('All Dates')} className="ml-1 hover:text-blue-300">×</button>
              </span>
            )}
            {selectedPrice !== 'All Prices' && (
              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-full text-sm flex items-center space-x-2">
                <DollarSign className="w-3 h-3" />
                <span>{selectedPrice}</span>
                <button onClick={() => setSelectedPrice('All Prices')} className="ml-1 hover:text-yellow-300">×</button>
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Sort Options */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-6 pt-6 border-t border-gray-700"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 font-medium">Sort by:</span>
            <select className="bg-dark-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-primary-500">
              <option>Date (Soonest)</option>
              <option>Date (Latest)</option>
              <option>Price (Low to High)</option>
              <option>Price (High to Low)</option>
              <option>Most Popular</option>
              <option>Recently Added</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <span>Showing 24 of 48 events</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EventFilters;
