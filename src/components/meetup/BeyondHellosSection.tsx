'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import BeyondHellosEventCard from '@/components/meetup/BeyondHellosEventCard';
import BeyondHellosBookingModal from '@/components/meetup/BeyondHellosBookingModal';
import {
  BEYOND_HELLOS_CONFIG_COLLECTION,
  BEYOND_HELLOS_CONFIG_DOC_ID,
  DEFAULT_BEYOND_HELLOS_CONFIG,
  parseBeyondHellosOffer,
  type BeyondHellosOffer,
} from '@/types/beyond-hellos';

export default function BeyondHellosSection() {
  const [offers, setOffers] = useState<BeyondHellosOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [bookingOffer, setBookingOffer] = useState<BeyondHellosOffer | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!db) {
        setOffers([{ id: BEYOND_HELLOS_CONFIG_DOC_ID, ...DEFAULT_BEYOND_HELLOS_CONFIG }]);
        setIsLoading(false);
        return;
      }
      try {
        const snap = await getDocs(collection(db, BEYOND_HELLOS_CONFIG_COLLECTION));
        const loaded = snap.docs.map((item) => parseBeyondHellosOffer(item.id, item.data()));
        loaded.sort((a, b) => {
          if (a.id === BEYOND_HELLOS_CONFIG_DOC_ID) return -1;
          if (b.id === BEYOND_HELLOS_CONFIG_DOC_ID) return 1;
          return a.title.localeCompare(b.title);
        });
        setOffers(
          loaded.length > 0
            ? loaded
            : [{ id: BEYOND_HELLOS_CONFIG_DOC_ID, ...DEFAULT_BEYOND_HELLOS_CONFIG }]
        );
      } catch (error) {
        console.error("Failed to load Beyond Hello's config:", error);
        toast.error('Could not load meetup details.');
        setOffers([{ id: BEYOND_HELLOS_CONFIG_DOC_ID, ...DEFAULT_BEYOND_HELLOS_CONFIG }]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleToggleExpand = (offerId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(offerId)) {
        next.delete(offerId);
      } else {
        next.add(offerId);
        setViewedIds((viewed) => new Set(viewed).add(offerId));
      }
      return next;
    });
  };

  const handleBook = (offer: BeyondHellosOffer) => {
    if (!viewedIds.has(offer.id) && !expandedIds.has(offer.id)) {
      setExpandedIds((prev) => new Set(prev).add(offer.id));
      setViewedIds((prev) => new Set(prev).add(offer.id));
      toast('Please read the full details before booking.', { icon: '📋' });
      return;
    }
    if (!offer.enabled) {
      toast.error('Bookings are not open yet.');
      return;
    }
    setBookingOffer(offer);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start ${
          offers.length === 1 ? 'max-w-4xl mx-auto' : ''
        }`}
      >
        {offers.map((offer) => (
          <BeyondHellosEventCard
            key={offer.id}
            config={offer}
            isExpanded={expandedIds.has(offer.id)}
            onToggleExpand={() => handleToggleExpand(offer.id)}
            onBook={() => handleBook(offer)}
          />
        ))}
      </div>
      {bookingOffer && (
        <BeyondHellosBookingModal
          config={bookingOffer}
          configId={bookingOffer.id}
          onClose={() => setBookingOffer(null)}
        />
      )}
    </>
  );
}
