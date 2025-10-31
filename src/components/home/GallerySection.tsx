'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Users, Camera, ArrowLeft, ArrowRight } from 'lucide-react';

const GallerySection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Sample gallery images - in production, these would come from your database
  const galleryImages = [
    {
      id: 1,
      src: '/api/placeholder/600/400',
      alt: 'Group photo at beach cleanup event',
      title: 'Beach Cleanup Adventure',
      description: '50+ participants came together for environmental conservation',
      category: 'Outdoor',
      participants: 52
    },
    {
      id: 2,
      src: '/api/placeholder/600/400',
      alt: 'Cooking workshop participants',
      title: 'Culinary Connections',
      description: 'Learning new recipes while making new friends',
      category: 'Workshop',
      participants: 28
    },
    {
      id: 3,
      src: '/api/placeholder/600/400',
      alt: 'Hiking group at mountain peak',
      title: 'Mountain Peak Expedition',
      description: 'Conquering heights and fears together',
      category: 'Adventure',
      participants: 35
    },
    {
      id: 4,
      src: '/api/placeholder/600/400',
      alt: 'Game night participants laughing',
      title: 'Board Game Bonanza',
      description: 'Laughter, strategy, and new friendships',
      category: 'Indoor',
      participants: 24
    },
    {
      id: 5,
      src: '/api/placeholder/600/400',
      alt: 'Art workshop creative session',
      title: 'Creative Canvas Night',
      description: 'Expressing creativity in a supportive community',
      category: 'Creative',
      participants: 18
    },
    {
      id: 6,
      src: '/api/placeholder/600/400',
      alt: 'Dance workshop group',
      title: 'Rhythm & Connection',
      description: 'Moving to the beat of friendship',
      category: 'Dance',
      participants: 42
    },
    {
      id: 7,
      src: '/api/placeholder/600/400',
      alt: 'Tech meetup networking',
      title: 'Tech Talk & Connect',
      description: 'Innovation meets social connection',
      category: 'Professional',
      participants: 65
    },
    {
      id: 8,
      src: '/api/placeholder/600/400',
      alt: 'Picnic in the park',
      title: 'Sunday Park Picnic',
      description: 'Simple pleasures, lasting memories',
      category: 'Casual',
      participants: 38
    },
    {
      id: 9,
      src: '/api/placeholder/600/400',
      alt: 'Photography walk group',
      title: 'City Photography Walk',
      description: 'Capturing moments and connections',
      category: 'Creative',
      participants: 22
    }
  ];

  const categories = ['All', 'Outdoor', 'Workshop', 'Adventure', 'Indoor', 'Creative', 'Dance', 'Professional', 'Casual'];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredImages = activeCategory === 'All' 
    ? galleryImages 
    : galleryImages.filter(img => img.category === activeCategory);

  const nextImage = () => {
    if (selectedImage !== null) {
      const currentIndex = filteredImages.findIndex(img => img.id === selectedImage);
      const nextIndex = (currentIndex + 1) % filteredImages.length;
      setSelectedImage(filteredImages[nextIndex].id);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      const currentIndex = filteredImages.findIndex(img => img.id === selectedImage);
      const prevIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
      setSelectedImage(filteredImages[prevIndex].id);
    }
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
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="py-20 bg-dark-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary-400/3 rounded-full blur-3xl"></div>
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
            <Camera className="w-4 h-4 inline mr-2" />
            Gallery
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Moments That <span className="gradient-text">Matter</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Every picture tells a story of connection, laughter, and friendship. 
            See the magic happen through our community's eyes.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-lg'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Gallery Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                variants={itemVariants}
                layout
                className="group relative overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => setSelectedImage(image.id)}
              >
                <div className="aspect-w-4 aspect-h-3 bg-dark-700">
                  <div className="w-full h-64 bg-gradient-to-br from-primary-500/20 to-primary-400/10 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{image.title}</p>
                      <p className="text-gray-300 text-sm">{image.participants} participants</p>
                    </div>
                  </div>
                </div>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                        {image.category}
                      </span>
                      <div className="flex items-center text-white text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        {image.participants}
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {image.title}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {image.description}
                    </p>
                  </div>
                </div>

                {/* Hover Effects */}
                <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/5 transition-colors duration-300" />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Load More Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-8 py-3 bg-dark-700 text-white rounded-full font-medium hover:bg-dark-600 transition-colors duration-300 border border-gray-600 hover:border-primary-500">
            View More Memories
          </button>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const currentImage = galleryImages.find(img => img.id === selectedImage);
                return currentImage ? (
                  <>
                    <div className="bg-dark-800 rounded-2xl overflow-hidden">
                      <div className="aspect-w-16 aspect-h-10 bg-gradient-to-br from-primary-500/20 to-primary-400/10">
                        <div className="w-full h-96 flex items-center justify-center">
                          <div className="text-center">
                            <Users className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                            <h3 className="text-white text-2xl font-bold mb-2">{currentImage.title}</h3>
                            <p className="text-gray-300 mb-4">{currentImage.description}</p>
                            <div className="flex items-center justify-center text-primary-400">
                              <Users className="w-5 h-5 mr-2" />
                              <span>{currentImage.participants} participants joined this event</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 bg-dark-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="px-3 py-1 bg-primary-500 text-white text-sm rounded-full">
                              {currentImage.category}
                            </span>
                            <div className="flex items-center text-gray-300">
                              <Heart className="w-4 h-4 mr-1 text-red-400" />
                              <span>Loved by community</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

              {/* Navigation */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-dark-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-dark-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-dark-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-dark-700 transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 w-10 h-10 bg-dark-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-dark-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default GallerySection;
