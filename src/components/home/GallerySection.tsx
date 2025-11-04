'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Users, Camera, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface GalleryImage {
  id: string;
  url: string;
  publicId?: string;
  fileName: string;
  title?: string;
  description?: string;
  category?: string;
  uploadedAt?: any;
}

const GallerySection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  // Fetch gallery images from Firestore
  useEffect(() => {
    const fetchGalleryImages = async () => {
      if (!db) {
        console.error('Firestore is not initialized');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const galleryCollection = collection(db, 'gallery');
        const q = query(galleryCollection, orderBy('uploadedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const images: GalleryImage[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            url: data.url || '',
            publicId: data.publicId,
            fileName: data.fileName || 'Untitled',
            title: data.title || data.fileName?.split('.')[0] || 'Untitled',
            description: data.description || '',
            category: data.category || 'All',
            uploadedAt: data.uploadedAt,
          };
        });

        setGalleryImages(images);
      } catch (error: any) {
        console.error('Error fetching gallery images:', error);
        // If there's an error, show empty state instead of crashing
        setGalleryImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  // Extract unique categories from images
  const categories = ['All', ...Array.from(new Set(galleryImages.map(img => img.category || 'All').filter(cat => cat !== 'All')))];

  const filteredImages = activeCategory === 'All' 
    ? galleryImages 
    : galleryImages.filter(img => (img.category || 'All') === activeCategory);

  const nextImage = () => {
    if (selectedImage !== null && filteredImages.length > 0) {
      const currentIndex = filteredImages.findIndex(img => img.id === selectedImage);
      const nextIndex = (currentIndex + 1) % filteredImages.length;
      setSelectedImage(filteredImages[nextIndex].id);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null && filteredImages.length > 0) {
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
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            <span className="ml-3 text-gray-300">Loading gallery...</span>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No images yet</h3>
            <p className="text-gray-400">Check back soon for amazing moments from our community!</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
          >
            <AnimatePresence>
              {filteredImages.map((image) => (
                <motion.div
                  key={image.id}
                  variants={itemVariants}
                  layout
                  className="group cursor-pointer"
                  onClick={() => setSelectedImage(image.id)}
                >
                  <div className="relative overflow-hidden rounded-2xl mb-3">
                    <div className="aspect-w-4 aspect-h-3 bg-dark-700">
                      <img
                        src={image.url}
                        alt={image.title || image.fileName}
                        className="w-full h-[8.8rem] sm:h-[11rem] md:h-[15.4rem] lg:h-[17.6rem] object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center justify-between mb-2">
                          {image.category && image.category !== 'All' && (
                            <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                              {image.category}
                            </span>
                          )}
                        </div>
                        {image.description && (
                          <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                            {image.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Hover Effects */}
                    <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/5 transition-colors duration-300" />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Title below image */}
                  <div className="px-2">
                    <h3 className="text-white font-semibold text-base text-center">
                      {image.title}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Load More removed per request */}
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
                const currentImage = filteredImages.find(img => img.id === selectedImage);
                return currentImage ? (
                  <>
                    <div className="bg-dark-800 rounded-2xl overflow-hidden">
                      <div className="aspect-w-16 aspect-h-10">
                        <img
                          src={currentImage.url}
                          alt={currentImage.title || currentImage.fileName}
                          className="w-full h-96 object-contain bg-dark-900"
                        />
                      </div>
                      <div className="p-6 bg-dark-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {currentImage.category && currentImage.category !== 'All' && (
                              <span className="px-3 py-1 bg-primary-500 text-white text-sm rounded-full">
                                {currentImage.category}
                              </span>
                            )}
                            <div className="flex items-center text-gray-300">
                              <Heart className="w-4 h-4 mr-1 text-red-400" />
                              <span>Loved by community</span>
                            </div>
                          </div>
                        </div>
                        <h3 className="text-white text-2xl font-bold mt-4 mb-2">{currentImage.title}</h3>
                        {currentImage.description && (
                          <p className="text-gray-300">{currentImage.description}</p>
                        )}
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
