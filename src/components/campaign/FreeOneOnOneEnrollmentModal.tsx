'use client';

import React from 'react';
import { CheckCircle, Phone } from 'lucide-react';
import { useCampaignLocale } from '@/lib/campaign-i18n/CampaignLocaleContext';
import { CampaignEnrollmentModalFrame } from '@/components/campaign/campaign-premium-ui';
import { formatIndianPhoneDisplay, telHrefIndian } from '@/lib/indian-phone';

type Props = {
  message: string;
  queryPhone: string;
  complaintPhone: string;
  onClose: () => void;
};

export default function FreeOneOnOneEnrollmentModal({
  message,
  queryPhone,
  complaintPhone,
  onClose,
}: Props) {
  const { messages } = useCampaignLocale();

  const contacts = [
    queryPhone.trim() ? { label: messages.contactQuery, phone: queryPhone.trim() } : null,
    complaintPhone.trim()
      ? { label: messages.contactComplaint, phone: complaintPhone.trim() }
      : null,
  ].filter(Boolean) as { label: string; phone: string }[];

  return (
    <CampaignEnrollmentModalFrame
      titleId="one-on-one-enrollment-title"
      onClose={onClose}
      icon={<CheckCircle className="w-8 h-8 text-green-400" strokeWidth={2} />}
      title={messages.modalOneOnOneTitle}
      subtitle={<p className="whitespace-pre-wrap text-gray-300">{message}</p>}
      closeLabel={messages.modalClose}
    >
      {contacts.length > 0 && (
        <div className="space-y-2 pt-1">
          {contacts.map(({ label, phone }) => (
            <a
              key={label}
              href={telHrefIndian(phone)}
              className="flex items-center justify-between gap-3 w-full py-3.5 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-primary-400/35 transition-all text-sm"
            >
              <span className="text-gray-400">{label}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary-300">
                <Phone className="w-4 h-4" />
                {formatIndianPhoneDisplay(phone)}
              </span>
            </a>
          ))}
        </div>
      )}
    </CampaignEnrollmentModalFrame>
  );
}
