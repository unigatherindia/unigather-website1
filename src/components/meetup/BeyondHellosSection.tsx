'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import BeyondHellosEventCard from '@/components/meetup/BeyondHellosEventCard';
import BeyondHellosBookingModal from '@/components/meetup/BeyondHellosBookingModal';
import {
  BEYOND_HELLOS_CONFIG_COLLECTION,
  BEYOND_HELLOS_CONFIG_DOC_ID,
  DEFAULT_BEYOND_HELLOS_CONFIG,
  parseBeyondHellosConfig,
  type BeyondHellosConfig,
} from '@/types/beyond-hellos';

export default function BeyondHellosSection() {
  const [config, setConfig] = useState<BeyondHellosConfig>(DEFAULT_BEYOND_HELLOS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasReadDetails, setHasReadDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, BEYOND_HELLOS_CONFIG_COLLECTION, BEYOND_HELLOS_CONFIG_DOC_ID));
        setConfig(parseBeyondHellosConfig(snap.data()));
      } catch (error) {
        console.error('Failed to load Beyond Hello\'s config:', error);
        toast.error('Could not load meetup details.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (next) setHasReadDetails(true);
      return next;
    });
  };

  const handleBook = () => {
    if (!hasReadDetails && !isExpanded) {
      setIsExpanded(true);
      setHasReadDetails(true);
      toast('Please read the full details before booking.', { icon: '📋' });
      return;
    }
    if (!config.enabled) {
      toast.error('Bookings are not open yet.');
      return;
    }
    setShowModal(true);
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
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start max-w-4xl mx-auto">
        <BeyondHellosEventCard
          config={config}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
          onBook={handleBook}
        />
      </div>
      {showModal && (
        <BeyondHellosBookingModal config={config} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
