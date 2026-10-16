'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  Clock,
  HeartHandshake,
  MapPin,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import { formatEventPrice } from '@/lib/formatPrice';
import { isTicketSoldOut } from '@/lib/ticket-price-utils';
import {
  getBeyondHellosTicketPriceRaw,
  hasAnyBeyondHellosTicketListed,
  isBeyondHellosFullySoldOut,
  isBeyondHellosTicketListed,
  type BeyondHellosConfig,
} from '@/types/beyond-hellos';

type Props = {
  config: BeyondHellosConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onBook: () => void;
  bookDisabled?: boolean;
};

export default function BeyondHellosEventCard({
  config,
  isExpanded,
  onToggleExpand,
  onBook,
  bookDisabled,
}: Props) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Outdoor':
        return 'text-green-400 bg-green-500/20';
      case 'Creative':
        return 'text-purple-400 bg-purple-500/20';
      case 'Social':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400 bg-green-500/20';
      case 'Moderate':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'Challenging':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const showMale = isBeyondHellosTicketListed(config, 'male');
  const showFemale = isBeyondHellosTicketListed(config, 'female');
  const priceAvailable = config.enabled && hasAnyBeyondHellosTicketListed(config);
  const isEventSoldOut = isBeyondHellosFullySoldOut(config);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`group relative h-fit self-start bg-dark-700 rounded-3xl overflow-hidden border transition-all duration-500 hover:transform hover:scale-[1.02] ${
        config.featured
          ? 'border-primary-500/50 shadow-lg shadow-primary-500/20'
          : 'border-gray-700/50 hover:border-primary-500/30'
      }`}
    >
      {config.featured && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-gradient-to-r from-primary-500 to-primary-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <Star className="w-3 h-3 fill-current" />
            <span>Featured</span>
          </div>
        </div>
      )}

      <div className="relative h-48 overflow-hidden">
        {config.image ? (
          <>
            <img src={config.image} alt={config.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <HeartHandshake className="w-12 h-12 text-white mx-auto mb-2 drop-shadow-lg" />
                <p className="text-white font-semibold drop-shadow-lg">{config.category} Experience</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-primary-400/20 flex items-center justify-center">
              <div className="text-center">
                <HeartHandshake className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-semibold">{config.category} Experience</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(config.category)}`}>
            {config.category}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(config.difficulty)}`}>
            {config.difficulty}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
          {config.title}
        </h3>

        <div className="flex items-center text-gray-300 text-sm mb-3">
          <Calendar className="w-4 h-4 mr-3 text-primary-400 flex-shrink-0" />
          <span>{config.scheduleNote}</span>
        </div>

        <div className="space-y-3 mb-3">
          <div className="flex items-center text-gray-300 text-sm">
            <MapPin className="w-4 h-4 mr-3 text-primary-400 flex-shrink-0" />
            <span>{config.locationLabel}</span>
          </div>
          <div className="flex items-center text-gray-300 text-sm">
            <Clock className="w-4 h-4 mr-3 text-primary-400 flex-shrink-0" />
            <span>{config.duration}</span>
          </div>
          <div className="flex items-center text-sm text-gray-300">
            <Users className="w-4 h-4 mr-3 text-primary-400 flex-shrink-0" />
            <span>{config.groupLabel}</span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="expanded-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-4">
                {config.description}
              </p>
              {config.highlights.length > 0 && (
                <ul className="text-sm text-gray-400 space-y-2 mb-4 list-disc pl-5">
                  {config.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex w-full items-center justify-end text-primary-400 hover:text-primary-300 text-sm font-medium mb-4 transition-colors sm:w-auto sm:justify-start"
        >
          <ChevronDown
            className={`w-4 h-4 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
          <span>{isExpanded ? 'See Less' : 'See More'}</span>
        </button>

        {priceAvailable && (showMale || showFemale) && (
          <div className="event-ticket-prices bg-dark-800 rounded-2xl p-3 sm:p-4 mb-6">
            <div className="mb-2">
              <span className="text-gray-300 text-sm sm:text-base font-medium">Booking fee</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-between gap-x-4 gap-y-2">
              {showMale && (
                <div className="text-center min-w-0 sm:flex-1">
                  <div className="text-blue-400 text-xs sm:text-sm mb-0.5">Male</div>
                  <div
                    className={`text-white font-bold text-sm sm:text-base ${
                      isTicketSoldOut(getBeyondHellosTicketPriceRaw(config, 'male'))
                        ? 'text-gray-500 line-through'
                        : ''
                    }`}
                  >
                    {formatEventPrice(getBeyondHellosTicketPriceRaw(config, 'male'), config.currency)}
                  </div>
                </div>
              )}
              {showFemale && (
                <div className="text-center min-w-0 sm:flex-1">
                  <div className="text-pink-400 text-xs sm:text-sm mb-0.5">Female</div>
                  <div
                    className={`text-white font-bold text-sm sm:text-base ${
                      isTicketSoldOut(getBeyondHellosTicketPriceRaw(config, 'female'))
                        ? 'text-gray-500 line-through'
                        : ''
                    }`}
                  >
                    {formatEventPrice(getBeyondHellosTicketPriceRaw(config, 'female'), config.currency)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onBook}
          disabled={bookDisabled || !priceAvailable || isEventSoldOut}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!config.enabled ? (
            <>
              <Ticket className="w-5 h-5" />
              <span>Coming soon</span>
            </>
          ) : isEventSoldOut ? (
            <>
              <Ticket className="w-5 h-5" />
              <span>Sold out</span>
            </>
          ) : (
            <>
              <Ticket className="w-5 h-5" />
              <span>Book now</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
