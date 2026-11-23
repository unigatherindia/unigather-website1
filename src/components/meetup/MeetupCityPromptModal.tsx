'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CampaignEnrollmentModalFrame,
  campaignFieldClass,
  campaignLabelClass,
} from '@/components/campaign/campaign-premium-ui';
import { whatsappSendHrefIndian } from '@/lib/indian-phone';

type Props = {
  number: string;
  /** Message template with a `{city}` placeholder. */
  messageTemplate: string;
  onClose: () => void;
};

export default function MeetupCityPromptModal({ number, messageTemplate, onClose }: Props) {
  const [city, setCity] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) {
      toast.error('Please enter your city');
      return;
    }

    const message = messageTemplate.replace('{city}', trimmed);
    const href = whatsappSendHrefIndian(number, message);
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <CampaignEnrollmentModalFrame
      titleId="meetup-city-prompt-title"
      onClose={onClose}
      iconAccent="orange"
      icon={<MapPin className="h-8 w-8 text-primary-400" strokeWidth={2} />}
      title="Type Your City"
      subtitle="Share your city and we'll send you all the 1-on-1 Meetup details on WhatsApp."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="meetup-city-prompt" className={campaignLabelClass}>
            Type Your City
          </label>
          <input
            id="meetup-city-prompt"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="e.g. Pune, Mumbai, Delhi..."
            className={campaignFieldClass}
            autoFocus
            autoComplete="address-level2"
            maxLength={60}
          />
        </div>
        <button
          type="submit"
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary-500 via-orange-500 to-primary-600 px-6 py-3.5 font-semibold tracking-wide text-white shadow-md shadow-black/25 transition-colors hover:from-primary-400 hover:via-orange-400 hover:to-primary-500"
        >
          <span>Proceed</span>
          <ArrowRight
            className="h-5 w-5 shrink-0 opacity-90 transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </button>
      </form>
    </CampaignEnrollmentModalFrame>
  );
}
