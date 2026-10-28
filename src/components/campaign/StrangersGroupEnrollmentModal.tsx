'use client';

import React from 'react';
import { CheckCircle, ExternalLink, Instagram, MessageCircle } from 'lucide-react';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';
import {
  CampaignEnrollmentModalFrame,
  CampaignModalActionPrimary,
  CampaignModalActionSecondary,
} from '@/components/campaign/campaign-premium-ui';
import { formatIndianPhoneDisplay, whatsappHrefIndian } from '@/lib/indian-phone';

type Props = {
  cityName: string;
  instaGroupLink: string;
  unigatherInstagramUrl: string;
  whatsappNumber: string;
  onClose: () => void;
};

export default function StrangersGroupEnrollmentModal({
  cityName,
  instaGroupLink,
  unigatherInstagramUrl,
  whatsappNumber,
  onClose,
}: Props) {
  const { messages } = useCampaignLocale();
  const waLink = whatsappHrefIndian(whatsappNumber);
  const whatsappDisplay = formatIndianPhoneDisplay(whatsappNumber);

  const subtitle = cityName
    ? messages.modalStrangersSubtitleWithCity.replace('{city}', cityName)
    : messages.modalStrangersSubtitle;

  return (
    <CampaignEnrollmentModalFrame
      titleId="enrollment-success-title"
      onClose={onClose}
      icon={<CheckCircle className="w-8 h-8 text-green-400" strokeWidth={2} />}
      title={messages.modalStrangersTitle}
      subtitle={subtitle}
      closeLabel={messages.modalClose}
    >
      {instaGroupLink ? (
        <CampaignModalActionPrimary href={instaGroupLink}>
          <Instagram className="w-5 h-5" />
          {messages.modalStrangersJoinGroup}
          <ExternalLink className="w-4 h-4 opacity-80" />
        </CampaignModalActionPrimary>
      ) : (
        <p className="text-amber-100/90 text-sm text-center bg-amber-500/10 border border-amber-400/25 rounded-xl py-3.5 px-4">
          {messages.modalStrangersNoLink}
        </p>
      )}

      <CampaignModalActionSecondary href={unigatherInstagramUrl}>
        <Instagram className="w-5 h-5 text-pink-400" />
        {messages.modalStrangersFollowInsta}
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </CampaignModalActionSecondary>

      {waLink ? (
        <CampaignModalActionSecondary href={waLink}>
          <MessageCircle className="w-5 h-5 text-green-400" />
          {messages.modalStrangersWhatsapp.replace('{phone}', whatsappDisplay)}
        </CampaignModalActionSecondary>
      ) : null}
    </CampaignEnrollmentModalFrame>
  );
}
